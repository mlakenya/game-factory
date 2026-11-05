import * as Phaser from 'phaser';
import { INTRO, LEVELS } from '../../content/levels';
import { TOY_WEIGHTS } from '../../content/toys';
import { TOY_H, drawBackground, makeTextures, toyKey } from '../art';
import { CTX, FONT, type GameContext } from '../context';
import {
  type Board, EMPTY, type Move, type Slot, addSpare, applyMove, canMove, get, isLocked, shuffleSameWeight, status,
  tilt, toysLeft,
} from '../logic/board';
import { generate } from '../logic/generator';
import { interstitialAfterWin, recordWin, starsFor } from '../logic/progress';
import { type Button, button, title } from '../ui';
import type { OverlayData } from './OverlayScene';

const PIVOT = { x: 360, y: 1100 }; // trunk base: the point the whole tree leans around
const BOTTOM_ROW_Y = 990;
const TOY_CENTER = 46; // from the hook down to the middle of a toy
const METER = { x: 320, y: 138, w: 420 };
const TREE_AREA = { top: 190, width: 700 }; // the tree is scaled to fill this, down to the trunk base

const slotId = (s: Slot) => `${s.branch}:${s.hook}`;

/** One level: drag toys between hooks, make triples, keep the tree from leaning too far. */
export class GameScene extends Phaser.Scene {
  private ctx!: GameContext;
  private level = 1;
  private board!: Board;
  private before: Board | null = null; // board before the last move, for «bring the star back»
  private maxTilt = 0;
  private busy = false;
  private ended = false;

  private unit = 70;
  private gap = 160;
  /** Whole-tree scale: small early trees are enlarged so they fill the screen. */
  private zoom = 1;
  private starIcons: Phaser.GameObjects.Image[] = [];
  private shownStars = 3;
  private tree!: Phaser.GameObjects.Container;
  private toyLayer!: Phaser.GameObjects.Container;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private markers = new Map<string, Phaser.GameObjects.Arc>();
  private snow: Phaser.GameObjects.Graphics[] = [];
  private behind: Phaser.GameObjects.Image[] = [];
  private garland: Phaser.GameObjects.Arc[] = [];
  private star!: Phaser.GameObjects.Image;
  private needle!: Phaser.GameObjects.Triangle;
  private ghost!: Phaser.GameObjects.Triangle;
  private leftText!: Phaser.GameObjects.Text;
  private spareBtn!: Button;
  private shuffleBtn!: Button;
  private hint: Phaser.GameObjects.Container | null = null;

  private selected: Slot | null = null;
  private drag: { slot: Slot; img: Phaser.GameObjects.Image; startX: number; startY: number; moved: boolean } | null = null;
  private lastCreak = 0;

  constructor() { super('game'); }

  init(data: { level?: number }) {
    this.level = Phaser.Math.Clamp(data.level ?? 1, 1, LEVELS.length);
  }

  create() {
    this.ctx = this.registry.get(CTX) as GameContext;
    makeTextures(this);
    const spec = LEVELS[this.level - 1];
    this.board = generate(spec, TOY_WEIGHTS);
    this.before = null;
    this.maxTilt = 0;
    this.busy = false;
    this.ended = false;
    this.selected = null;
    this.drag = null;
    this.sprites.clear();
    this.markers.clear();
    this.snow = [];
    this.hint = null;

    const rows = spec.rows;
    const maxDist = Math.max(...this.board.branches.flatMap((b) => b.dist));
    this.unit = Math.min(78, 285 / maxDist);
    this.gap = Math.min(260, 780 / (rows - 1 + 0.75));
    const naturalH = PIVOT.y - (BOTTOM_ROW_Y - (rows - 1) * this.gap - this.gap * 0.75 - 70);
    const naturalW = 2 * ((maxDist + 0.75) * this.unit + 12);
    this.zoom = Math.min((PIVOT.y - TREE_AREA.top) / naturalH, TREE_AREA.width / naturalW, 1.6);

    drawBackground(this, this.ctx.config.colors.backgroundTop, this.ctx.config.colors.backgroundBottom);
    this.drawStand();
    this.tree = this.add.container(PIVOT.x, PIVOT.y).setScale(this.zoom);
    this.drawTree();
    this.toyLayer = this.add.container(0, 0);
    this.tree.add(this.toyLayer);
    this.drawHud();
    this.sync();
    this.tree.setRotation(this.targetRotation());
    this.updateMeter();

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.onDown, this);
      this.input.off('pointermove', this.onMove, this);
      this.input.off('pointerup', this.onUp, this);
    });

    this.ctx.platform.gameplayStart();
    this.maybeHint();
    this.exposeForTests();
  }

  update() {
    // Toys hang straight down while the tree leans.
    const r = -this.tree.rotation;
    for (const img of this.sprites.values()) img.setRotation(r);
    for (const img of this.behind) img.setRotation(r);
  }

  // ---------- geometry ----------

  private rowY(row: number) {
    const rows = LEVELS[this.level - 1].rows;
    return BOTTOM_ROW_Y - (rows - 1 - row) * this.gap - PIVOT.y;
  }

  /** Hook position in tree-local coordinates. */
  private hookLocal(s: Slot) {
    if (s.branch < 0) {
      const n = this.board.spare.length;
      return { x: n === 1 ? 0 : (s.hook - (n - 1) / 2) * 68, y: BOTTOM_ROW_Y - PIVOT.y + 12 };
    }
    const b = this.board.branches[s.branch];
    return { x: b.side * b.dist[s.hook] * this.unit, y: this.rowY(b.row) };
  }

  private toWorld(lx: number, ly: number) {
    const r = this.tree.rotation, c = Math.cos(r), s = Math.sin(r);
    const z = this.zoom;
    return { x: PIVOT.x + (lx * c - ly * s) * z, y: PIVOT.y + (lx * s + ly * c) * z };
  }

  /** Centre of the toy on a hook (or of the empty spot under it) in world coordinates. */
  private slotWorld(s: Slot) {
    const p = this.hookLocal(s);
    const r = this.tree.rotation;
    const top = this.toWorld(p.x, p.y);
    // The toy hangs straight down from the hook, regardless of the lean.
    return { x: top.x, y: top.y + TOY_CENTER * this.zoom, hookX: top.x, hookY: top.y, r };
  }

  private allSlots(): Slot[] {
    const out: Slot[] = [];
    this.board.hooks.forEach((h, branch) => h.forEach((_, hook) => out.push({ branch, hook })));
    this.board.spare.forEach((_, hook) => out.push({ branch: -1, hook }));
    return out;
  }

  private slotAt(x: number, y: number, radius: number, filter: (s: Slot) => boolean): Slot | null {
    let best: Slot | null = null, bestD = radius;
    for (const s of this.allSlots()) {
      if (!filter(s)) continue;
      const p = this.slotWorld(s);
      const d = Math.hypot(p.x - x, (p.y - y) * 0.8);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  private targetRotation(b = this.board) {
    const t = Phaser.Math.Clamp(tilt(b), -1.15, 1.15);
    return Phaser.Math.DegToRad(t * this.ctx.config.gameplay.maxAngleDeg);
  }

  // ---------- drawing ----------

  private drawStand() {
    const g = this.add.graphics();
    g.fillStyle(0x8b1e1e).fillRoundedRect(PIVOT.x - 70, PIVOT.y - 6, 140, 56, 10);
    g.fillStyle(0xffd43b).fillRect(PIVOT.x - 70, PIVOT.y + 10, 140, 8);
    this.add.image(110, PIVOT.y + 30, 'box').setScale(0.85).setName('box');
  }

  private drawTree() {
    const { colors } = this.ctx.config;
    const g = this.add.graphics();
    const rows = LEVELS[this.level - 1].rows;
    const top = this.rowY(0) - this.gap * 0.75;
    g.fillStyle(colors.trunk).fillRect(-22, this.rowY(rows - 1), 44, -this.rowY(rows - 1) + 4);
    g.fillStyle(0x5a2d0c).fillRect(8, this.rowY(rows - 1), 14, -this.rowY(rows - 1) + 4);
    // Foliage: one tier per row, widest at the bottom; dark outline, light left side, snow caps.
    for (let row = 0; row < rows; row++) {
      const b = this.board.branches[row * 2];
      const half = (b.dist[b.dist.length - 1] + 0.75) * this.unit;
      const y = this.rowY(row);
      const apex = row === 0 ? top : this.rowY(row - 1) - this.gap * 0.15;
      g.fillStyle(colors.needlesEdge).fillTriangle(0, apex - 10, -half - 14, y + 34, half + 14, y + 34);
      g.fillStyle(colors.needles).fillTriangle(0, apex, -half, y + 24, half, y + 24);
      g.fillStyle(colors.needlesLight).fillTriangle(0, apex, -half, y + 24, -half * 0.15, y + 24);
      // Scalloped hem
      for (let i = -3; i <= 3; i++) g.fillStyle(colors.needlesDark).fillCircle(i * half * 0.29, y + 24, half * 0.13);
      g.fillStyle(0xffffff, 0.95);
      for (let i = -2; i <= 2; i++) g.fillEllipse(i * half * 0.42, y + 22 - Math.abs(i) * 2, half * 0.34, 14);
    }
    this.tree.add(g);
    // Branch bars and hook rings
    this.board.branches.forEach((b, i) => {
      const y = this.rowY(b.row);
      const outer = b.side * (b.dist[b.dist.length - 1] + 0.45) * this.unit;
      const bar = this.add.graphics();
      bar.lineStyle(10, 0x4a2f15).lineBetween(b.side * 14, y - 8, outer, y + 2);
      this.tree.add(bar);
      const snow = this.add.graphics();
      const x0 = b.side * (b.dist[0] - 0.5) * this.unit, x1 = outer;
      snow.fillStyle(this.ctx.config.colors.snow, 0.82).fillRoundedRect(Math.min(x0, x1), y - 26, Math.abs(x1 - x0), TOY_H + 30, 22);
      snow.lineStyle(3, 0xffffff, 1).strokeRoundedRect(Math.min(x0, x1), y - 26, Math.abs(x1 - x0), TOY_H + 30, 22);
      snow.setVisible(this.board.frozen[i]);
      this.snow[i] = snow;
      this.tree.add(snow);
    });
    // Garland lights, lit on win
    this.garland = [];
    const palette = [0xffe14d, 0xff4d6d, 0x4dd2ff, 0x7dff6b, 0xff9f1c];
    for (let row = 0; row < rows; row++) {
      const b = this.board.branches[row * 2];
      const half = (b.dist[b.dist.length - 1] + 0.6) * this.unit;
      for (let i = 0; i <= 8; i++) {
        const x = -half + (2 * half * i) / 8;
        const yl = this.rowY(row) + 30 + Math.sin(i) * 4;
        const glow = this.add.circle(x, yl, 14, palette[(i + row) % 5], 0.25);
        const l = this.add.circle(x, yl, 7, palette[(i + row) % 5], 1);
        // Gentle twinkle all the time; the win animation speeds it up.
        this.tweens.add({ targets: glow, alpha: 0.05, duration: 700 + ((i * 137) % 500), yoyo: true, repeat: -1 });
        this.garland.push(l);
        this.tree.add([glow, l]);
      }
    }
    this.star = this.add.image(0, top - 16, 'star').setScale(0.9);
    this.tree.add(this.star);
  }

  private drawHud() {
    const { width } = this.scale.gameSize;
    const t = this.ctx.t;
    title(this, width / 2, 58, t('game.level', { n: this.level }), 44);
    this.leftText = this.add.text(width - 28, 58, '', { fontFamily: FONT, fontSize: '28px', color: this.ctx.config.colors.textDim })
      .setOrigin(1, 0.5);
    button(this, 62, 58, 84, 76, 'II', () => this.pause(), { color: this.ctx.config.colors.buttonAlt, fontSize: 34, name: 'btn-pause' });

    // Tilt meter: green → yellow → red, same thresholds as the stars.
    const weightOn = this.board.weightOn;
    const g = this.add.graphics().setVisible(weightOn);
    const { x, y, w } = METER;
    const [s3, s2] = this.ctx.config.gameplay.starThresholds;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x - w / 2 - 8, y - 18, w + 16, 36, 18);
    g.fillStyle(0xe03131).fillRoundedRect(x - w / 2, y - 10, w, 20, 10);
    g.fillStyle(0xfab005).fillRect(x - (w / 2) * s2, y - 10, w * s2, 20);
    g.fillStyle(0x40c057).fillRect(x - (w / 2) * s3, y - 10, w * s3, 20);
    g.fillStyle(0xffffff).fillRect(x - 2, y - 14, 4, 28);
    this.ghost = this.add.triangle(x, y + 26, 0, 0, 24, 0, 12, -20, 0xffffff, 0.45).setVisible(false);
    this.needle = this.add.triangle(x, y + 26, 0, 0, 26, 0, 13, -22, 0xffffff).setStrokeStyle(3, 0x0b1d3a).setVisible(weightOn);
    // Stars you still keep on this level: one goes out when the needle enters yellow, another in red.
    this.shownStars = 3;
    this.starIcons = [0, 1, 2].map((i) => this.add.image(x + w / 2 + 48 + i * 42, y, 'star').setScale(0.38).setVisible(weightOn));

    const by = 1212;
    this.spareBtn = button(this, 190, by, 300, 96, t('game.spare'), () => this.boostSpare(),
      { color: this.ctx.config.colors.buttonAd, sub: t('game.ad'), fontSize: 32, name: 'btn-spare' });
    this.shuffleBtn = button(this, 530, by, 300, 96, t('game.shuffle'), () => this.boostShuffle(),
      { color: this.ctx.config.colors.buttonAd, sub: t('game.ad'), fontSize: 32, name: 'btn-shuffle' });
    if (this.level <= 2) { this.spareBtn.setVisible(false); this.shuffleBtn.setVisible(false); }
  }

  /** Rebuilds toy sprites from the board. */
  private sync(revealed: number[] = []) {
    this.toyLayer.removeAll(true);
    this.sprites.clear();
    this.markers.clear();
    this.behind = [];
    for (const s of this.allSlots()) {
      const p = this.hookLocal(s);
      const ring = this.add.circle(p.x, p.y + TOY_CENTER, 22, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.22);
      this.toyLayer.add(ring);
      this.markers.set(slotId(s), ring);
      if (s.branch < 0) this.toyLayer.add(this.add.circle(p.x, p.y, 7, 0xffd43b));
    }
    // Next hidden layer peeks out above the branch.
    this.board.back.forEach((layers, i) => {
      const next = layers[0];
      if (!next) return;
      next.forEach((k, hook) => {
        if (k === EMPTY) return;
        const p = this.hookLocal({ branch: i, hook });
        const img = this.add.image(p.x, p.y - 58, toyKey(k)).setOrigin(0.5, 0).setScale(0.5).setAlpha(0.55).setTint(0x8899bb);
        this.behind.push(img);
        this.toyLayer.add(img);
      });
    });
    for (const s of this.allSlots()) {
      const k = get(this.board, s);
      if (k === EMPTY) continue;
      const p = this.hookLocal(s);
      const img = this.add.image(p.x, p.y, toyKey(k)).setOrigin(0.5, 0);
      if (isLocked(this.board, s)) img.setTint(0xbcd7ff);
      if (s.branch >= 0 && revealed.includes(s.branch)) {
        img.setAlpha(0).setScale(0.5);
        this.tweens.add({ targets: img, alpha: 1, scale: 1, duration: 300, delay: 250, ease: 'Back.out' });
      }
      this.sprites.set(slotId(s), img);
      this.toyLayer.add(img);
    }
    this.board.frozen.forEach((f, i) => this.snow[i]?.setVisible(f));
    // Snow covers the toys of frozen branches; star stays on top of everything.
    for (const sn of this.snow) this.tree.bringToTop(sn);
    this.tree.bringToTop(this.star);
    this.leftText.setText(this.ctx.t('game.left', { n: toysLeft(this.board) }));
    const spareLeft = this.board.spare.length < this.ctx.config.gameplay.maxSpare;
    this.spareBtn.setEnabled(spareLeft && !this.ended);
    this.highlight();
  }

  private highlight(target: Slot | null = null, danger = false) {
    for (const [id, ring] of this.markers) {
      const [branch, hook] = id.split(':').map(Number);
      const s = { branch, hook };
      const free = get(this.board, s) === EMPTY && !isLocked(this.board, s);
      const isTarget = target && slotId(target) === id;
      if (!free) ring.setStrokeStyle(3, 0xffffff, 0).setFillStyle(0xffffff, 0);
      else if (isTarget) ring.setStrokeStyle(5, danger ? 0xff6b6b : 0xffd43b, 1).setFillStyle(danger ? 0xff6b6b : 0xffd43b, 0.3);
      else if (this.selected) ring.setStrokeStyle(4, 0xffd43b, 0.75).setFillStyle(0xffd43b, 0.1);
      else ring.setStrokeStyle(3, 0xffffff, 0.3).setFillStyle(0xffffff, 0);
    }
  }

  private updateMeter(preview: Board | null = null) {
    const { x, w } = METER;
    const pos = (b: Board) => x + Phaser.Math.Clamp(tilt(b), -1.08, 1.08) * (w / 2) - 13;
    this.tweens.add({ targets: this.needle, x: pos(this.board), duration: 250, ease: 'Sine.out' });
    const danger = Math.abs(tilt(this.board)) >= this.ctx.config.gameplay.dangerTilt;
    const keep = starsFor(this.maxTilt, this.board.weightOn, this.ctx.config.gameplay.starThresholds);
    while (this.shownStars > keep) {
      const icon = this.starIcons[--this.shownStars];
      icon.setTint(0x3b4a66);
      this.tweens.add({ targets: icon, scale: { from: 0.6, to: 0.38 }, duration: 300, ease: 'Back.out' });
    }
    this.needle.setFillStyle(danger ? 0xff6b6b : 0xffffff);
    if (preview && this.board.weightOn) {
      const lost = status(preview) === 'lost';
      this.ghost.setVisible(true).setPosition(pos(preview) + 1, this.ghost.y).setFillStyle(lost ? 0xff6b6b : 0xffffff, 0.55);
    } else {
      this.ghost.setVisible(false);
    }
  }

  // ---------- input ----------

  private canAct() { return !this.busy && !this.ended && !this.hint && this.scene.isActive(); }

  private movable = (s: Slot) => get(this.board, s) !== EMPTY && !isLocked(this.board, s);
  private freeSlot = (s: Slot) => get(this.board, s) === EMPTY && !isLocked(this.board, s);

  private onDown(p: Phaser.Input.Pointer) {
    if (!this.canAct()) return;
    const hit = this.slotAt(p.x, p.y, 52, (s) => get(this.board, s) !== EMPTY);
    if (hit && isLocked(this.board, hit)) { this.ctx.sfx.deny(); this.shake(hit); return; }
    if (hit && this.movable(hit)) {
      this.select(hit);
      const img = this.sprites.get(slotId(hit))!;
      this.drag = { slot: hit, img, startX: p.x, startY: p.y, moved: false };
      return;
    }
    if (this.selected) {
      const target = this.slotAt(p.x, p.y, this.ctx.config.gameplay.dropRadius, this.freeSlot);
      if (target) this.tryMove({ from: this.selected, to: target });
      else this.select(null);
    }
  }

  private onMove(p: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d || !p.isDown) return;
    if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) < this.ctx.config.gameplay.dragThreshold) return;
    if (!d.moved) {
      d.moved = true;
      // A copy outside the leaning tree follows the finger exactly; the original waits on its hook.
      d.img.setVisible(false);
      d.img = this.add.image(p.x, p.y - 30, d.img.texture.key).setOrigin(0.5, 0.45).setDepth(10).setScale(1.15 * this.zoom);
    }
    d.img.setPosition(p.x, p.y - 30);
    const target = this.slotAt(p.x, p.y - 30, this.ctx.config.gameplay.dropRadius, this.freeSlot);
    this.preview(target ? { from: d.slot, to: target } : null);
  }

  private onUp(p: Phaser.Input.Pointer) {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return; // a tap: the toy stays selected
    const target = this.slotAt(p.x, p.y - 30, this.ctx.config.gameplay.dropRadius, this.freeSlot);
    d.img.destroy();
    if (target && this.tryMove({ from: d.slot, to: target }, false)) return;
    this.select(null);
    this.sync();
  }

  private select(s: Slot | null) {
    if (this.selected) {
      const old = this.sprites.get(slotId(this.selected));
      if (old) old.setScale(1).setY(this.hookLocal(this.selected).y);
    }
    this.selected = s;
    if (s) {
      this.ctx.sfx.pick();
      const img = this.sprites.get(slotId(s));
      img?.setScale(1.12).setY(this.hookLocal(s).y - 12);
    }
    this.preview(null);
  }

  private preview(m: Move | null) {
    if (!m || !canMove(this.board, m)) { this.highlight(); this.updateMeter(); return; }
    const next = applyMove(this.board, m).board;
    this.highlight(m.to, status(next) === 'lost');
    this.updateMeter(next);
  }

  private shake(s: Slot) {
    const img = this.sprites.get(slotId(s));
    if (img) this.tweens.add({ targets: img, x: img.x + 6, duration: 50, yoyo: true, repeat: 3 });
  }

  // ---------- moves ----------

  private tryMove(m: Move, animate = true): boolean {
    if (!canMove(this.board, m)) return false;
    const fromPos = this.slotWorld(m.from);
    const k = get(this.board, m.from);
    const res = applyMove(this.board, m);
    this.before = this.board;
    const prevHooks = this.board.hooks.map((h) => [...h]);
    if (m.to.branch >= 0) prevHooks[m.to.branch][m.to.hook] = k;
    this.board = res.board;
    this.selected = null;
    this.ctx.sfx.drop();

    // Fly-in for tap moves
    const target = res.cleared.includes(m.to.branch) ? null : slotId(m.to);
    this.sync(res.revealed);
    if (animate && target) {
      const img = this.sprites.get(target);
      const to = this.slotWorld(m.to);
      if (img) {
        img.setVisible(false);
        const fly = this.add.image(fromPos.x, fromPos.y, toyKey(k)).setOrigin(0.5, 0.45).setDepth(10).setScale(this.zoom);
        this.tweens.add({ targets: fly, x: to.x, y: to.y, duration: 160, ease: 'Sine.out', onComplete: () => { fly.destroy(); img.setVisible(true); } });
      }
    }
    // Triples fly to the gift box.
    if (res.cleared.length) {
      this.ctx.sfx.triple();
      const box = this.children.getByName('box') as Phaser.GameObjects.Image;
      for (const b of res.cleared) {
        prevHooks[b].forEach((kind, hook) => {
          const p = this.slotWorld({ branch: b, hook });
          const fly = this.add.image(p.x, p.y, toyKey(kind)).setOrigin(0.5, 0.45).setDepth(9).setScale(this.zoom);
          this.tweens.add({
            targets: fly, x: box.x, y: box.y - 10, scale: 0.4, duration: 520, delay: 120 + hook * 60, ease: 'Cubic.in',
            onComplete: () => { fly.destroy(); this.tweens.add({ targets: box, scale: 0.95, duration: 80, yoyo: true }); },
          });
        });
      }
    }
    if (res.thawed.length) this.ctx.sfx.thaw();

    const t = Math.abs(tilt(this.board));
    this.maxTilt = Math.max(this.maxTilt, Math.min(t, 1));
    if (t >= this.ctx.config.gameplay.dangerTilt && this.time.now - this.lastCreak > 600) {
      this.lastCreak = this.time.now;
      this.ctx.sfx.creak();
    }
    this.tweens.add({ targets: this.tree, rotation: this.targetRotation(), duration: 450, ease: 'Back.out' });
    this.updateMeter();

    const st = status(this.board);
    if (st === 'lost') this.lose();
    else if (st === 'won') this.win();
    return true;
  }

  // ---------- boosters (rewarded, by explicit button) ----------

  private async rewarded(): Promise<boolean> {
    this.busy = true;
    this.ctx.platform.gameplayStop();
    const ok = await this.ctx.ads.rewarded();
    if (this.scene.isActive()) this.ctx.platform.gameplayStart();
    this.busy = false;
    return ok;
  }

  private async boostSpare() {
    if (!this.canAct() || this.board.spare.length >= this.ctx.config.gameplay.maxSpare) return;
    if (!(await this.rewarded())) return;
    this.board = addSpare(this.board);
    this.select(null);
    this.sync();
  }

  private async boostShuffle() {
    if (!this.canAct()) return;
    if (!(await this.rewarded())) return;
    this.board = shuffleSameWeight(this.board, Math.random);
    this.select(null);
    this.sync();
    for (const img of this.sprites.values()) {
      this.tweens.add({ targets: img, scaleX: { from: 0, to: 1 }, duration: 300, ease: 'Back.out' });
    }
  }

  // ---------- end of level ----------

  private stopPlay() {
    this.ended = true;
    this.select(null);
    this.ctx.platform.gameplayStop();
  }

  private win() {
    this.stopPlay();
    this.ctx.sfx.win();
    this.garland.forEach((l, i) => {
      this.tweens.add({ targets: l, fillAlpha: { from: 0.3, to: 1 }, scale: 1.4, duration: 300, delay: i * 25, yoyo: true, repeat: -1, repeatDelay: 200 });
    });
    this.tweens.add({ targets: this.star, scale: 1.1, angle: 360, duration: 900, ease: 'Cubic.out' });
    const spec = LEVELS[this.level - 1];
    const stars = starsFor(this.maxTilt, spec.limit > 0, this.ctx.config.gameplay.starThresholds);
    const rec = recordWin(this.ctx.save.get('stars'), this.ctx.save.get('unlocked'), this.level, stars, LEVELS.length);
    this.ctx.save.set('stars', rec.stars);
    this.ctx.save.set('unlocked', rec.unlocked);
    const last = this.level >= LEVELS.length;
    const t = this.ctx.t;
    this.time.delayedCall(1100, () => this.overlay({
      heading: t('win.title'),
      text: last ? t('win.last') : undefined,
      stars,
      actions: [
        ...(last ? [] : [{ label: t('win.next'), name: 'btn-next', onClick: () => this.next() }]),
        { label: t('common.menu'), color: this.ctx.config.colors.buttonAlt, onClick: () => this.toMenu() },
      ],
    }));
  }

  private async next() {
    const { interstitialFromLevel, interstitialEvery } = this.ctx.config.ads;
    if (interstitialAfterWin(this.level, interstitialFromLevel, interstitialEvery)) await this.ctx.ads.interstitial();
    this.scene.restart({ level: this.level + 1 });
  }

  private lose() {
    this.stopPlay();
    this.busy = true;
    this.ctx.sfx.fall();
    const from = this.toWorld(this.star.x, this.star.y);
    this.star.setVisible(false);
    const falling = this.add.image(from.x, from.y, 'star').setScale(0.8).setDepth(10);
    this.tweens.add({
      targets: falling, y: PIVOT.y + 40, x: from.x + Math.sign(tilt(this.board)) * 160, angle: 540, duration: 900, ease: 'Bounce.out',
    });
    const t = this.ctx.t;
    this.time.delayedCall(1200, () => {
      this.overlay({
        heading: t('lose.title'),
        text: t('lose.text'),
        actions: [
          { label: t('lose.revive'), sub: t('game.ad'), color: this.ctx.config.colors.buttonAd, name: 'btn-revive', onClick: () => this.revive(falling) },
          { label: t('lose.retry'), name: 'btn-retry', onClick: () => this.scene.restart({ level: this.level }) },
          { label: t('common.menu'), color: this.ctx.config.colors.buttonAlt, onClick: () => this.toMenu() },
        ],
      });
    });
  }

  /** Rewarded: undo the move that tipped the tree and put the star back. */
  private async revive(falling: Phaser.GameObjects.Image) {
    const ok = await this.ctx.ads.rewarded();
    if (!ok || !this.before) { this.scene.restart({ level: this.level }); return; }
    this.board = this.before;
    this.before = null;
    falling.destroy();
    this.star.setVisible(true).setScale(0);
    this.tweens.add({ targets: this.star, scale: 0.8, duration: 400, ease: 'Back.out' });
    this.sync();
    this.tweens.add({ targets: this.tree, rotation: this.targetRotation(), duration: 450, ease: 'Back.out' });
    this.updateMeter();
    this.ended = false;
    this.busy = false;
    this.spareBtn.setEnabled(this.board.spare.length < this.ctx.config.gameplay.maxSpare);
    this.ctx.platform.gameplayStart();
  }

  private pause() {
    if (this.ended || this.busy) return;
    this.select(null);
    this.ctx.platform.gameplayStop();
    this.scene.pause();
    const t = this.ctx.t;
    this.overlay({
      heading: t('pause.title'),
      actions: [
        { label: t('pause.resume'), name: 'btn-resume', onClick: () => { this.scene.resume(); this.ctx.platform.gameplayStart(); } },
        { label: t('pause.restart'), onClick: () => { this.scene.resume(); this.scene.restart({ level: this.level }); } },
        { label: t('pause.menu'), color: this.ctx.config.colors.buttonAlt, onClick: () => { this.scene.resume(); this.toMenu(); } },
      ],
    });
  }

  private overlay(data: OverlayData) {
    this.scene.launch('overlay', data);
    this.scene.bringToTop('overlay');
  }

  private toMenu() {
    this.ctx.platform.gameplayStop();
    this.scene.start('menu');
  }

  // ---------- hints ----------

  private maybeHint() {
    const spec = LEVELS[this.level - 1];
    const seen = this.ctx.save.get('hints');
    const want = (['basic', 'weight', 'hidden', 'frozen'] as const).find((h) => {
      if (seen.includes(h)) return false;
      if (h === 'basic') return true;
      if (h === 'weight') return spec.limit > 0 && this.level >= INTRO.weight;
      if (h === 'hidden') return (spec.hidden ?? 0) > 0;
      return (spec.frozen ?? 0) > 0;
    });
    if (!want) return;
    const { width, height } = this.scale.gameSize;
    const c = this.add.container(width / 2, height / 2).setDepth(20);
    const g = this.add.graphics();
    g.fillStyle(0x0b1d3a, 0.94).fillRoundedRect(-320, -150, 640, 300, 28);
    g.lineStyle(4, 0xffd43b).strokeRoundedRect(-320, -150, 640, 300, 28);
    const text = this.add.text(0, -30, this.ctx.t(`hint.${want}`), {
      fontFamily: FONT, fontSize: '32px', color: '#ffffff', align: 'center', wordWrap: { width: 580 }, lineSpacing: 6,
    }).setOrigin(0.5);
    const tap = this.add.text(0, 112, this.ctx.t('hint.tap'), { fontFamily: FONT, fontSize: '24px', color: this.ctx.config.colors.accent })
      .setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
    c.add([g, text, tap]);
    const shield = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35).setInteractive().setDepth(19);
    this.hint = c;
    shield.once('pointerup', () => {
      shield.destroy();
      c.destroy();
      this.hint = null;
      this.ctx.save.set('hints', [...this.ctx.save.get('hints'), want]);
    });
  }

  // ---------- test hook (mock platform only) ----------

  private exposeForTests() {
    if (this.ctx.platform.name !== 'mock') return;
    (window as unknown as { __dtt: unknown }).__dtt = {
      level: this.level,
      state: () => ({ level: this.level, status: status(this.board), left: toysLeft(this.board), tilt: tilt(this.board), hint: !!this.hint, ended: this.ended }),
      /** Canvas-relative fractions (0..1) of a slot's toy centre, for clicking in e2e tests. */
      point: (branch: number, hook: number) => {
        const p = this.slotWorld({ branch, hook });
        return { fx: p.x / this.scale.gameSize.width, fy: p.y / this.scale.gameSize.height };
      },
      /** Position of a named button in the game or overlay scene, or null if it is not shown. */
      button: (name: string) => {
        for (const key of ['overlay', 'game']) {
          const sc = this.scene.get(key);
          if (!sc || !this.scene.isActive(key)) continue;
          const obj = sc.children.getByName(name) as Phaser.GameObjects.Container | null;
          if (obj) return { fx: obj.x / this.scale.gameSize.width, fy: obj.y / this.scale.gameSize.height };
        }
        return null;
      },
    };
  }
}
