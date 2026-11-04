import type * as Phaser from 'phaser';

/** Simple text button with hover/press feedback. Large hit area for mobile. */
export function textButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
) {
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      backgroundColor: '#3b5bdb',
      padding: { x: 32, y: 16 },
      ...style,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  btn.on('pointerover', () => btn.setAlpha(0.85));
  btn.on('pointerout', () => btn.setAlpha(1).setScale(1));
  btn.on('pointerdown', () => btn.setScale(0.95));
  btn.on('pointerup', () => { btn.setScale(1); onClick(); });
  return btn;
}

/** Prevent page scroll, text selection, context menu and double-tap zoom (common moderation rejects). */
export function lockPageGestures() {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('selectstart', prevent);
  document.addEventListener('touchmove', prevent, { passive: false });
  document.addEventListener('dblclick', prevent);
}
