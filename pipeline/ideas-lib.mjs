// Parser and validator for the idea registry (knowledge/ideas.md).
// The registry is the single source of truth for an idea's stage:
// идея → концепт → одобрен → в разработке → выпущена (or отклонена / отложена).

/** Allowed statuses, in pipeline order. */
export const STATUSES = ['идея', 'концепт', 'одобрен', 'в разработке', 'выпущена', 'отклонена', 'отложена'];

/** Statuses that require a concept file (knowledge/concepts/<slug>.md). */
export const NEEDS_CONCEPT = ['концепт', 'одобрен', 'в разработке', 'выпущена'];

/** Statuses that allow games/<slug> to exist. */
export const GAME_STATUSES = ['в разработке', 'выпущена'];

export const COLUMNS = ['ID', 'Идея', 'Статус', 'Скан', 'Концепт', 'Заметка'];

const EMPTY = new Set(['', '—', '-']);
const cell = (s) => (EMPTY.has(s.trim()) ? '' : s.trim());

/** Concept column holds a link like [slug](concepts/slug.md) or a bare slug. */
export function conceptSlug(raw) {
  const v = cell(raw);
  if (!v) return '';
  const link = v.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return link ? link[1].trim() : v;
}

/**
 * Parse the registry markdown. Returns rows of the first table whose header starts with "ID".
 * @param {string} md
 * @returns {{ rows: Array<{line:number,id:string,title:string,status:string,scan:string,concept:string,note:string}>, errors: string[] }}
 */
export function parseIdeas(md) {
  const rows = [];
  const errors = [];
  const lines = md.split(/\r?\n/);
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      if (inTable) break;
      continue;
    }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (!inTable) {
      if (cells[0] === 'ID') {
        inTable = true;
        if (cells.join('|') !== COLUMNS.join('|')) errors.push(`строка ${i + 1}: колонки должны быть: ${COLUMNS.join(' | ')}`);
      }
      continue;
    }
    if (/^:?-+:?$/.test(cells[0])) continue;
    if (cells.length !== COLUMNS.length) {
      errors.push(`строка ${i + 1}: ожидалось ${COLUMNS.length} колонок, найдено ${cells.length}`);
      continue;
    }
    const [id, title, status, scan, concept, note] = cells;
    rows.push({ line: i + 1, id, title: cell(title), status, scan: cell(scan), concept: conceptSlug(concept), note: cell(note) });
  }
  if (!inTable) errors.push('не найдена таблица с колонкой ID');
  return { rows, errors };
}

/**
 * Validate parsed rows against the file system.
 * @param {ReturnType<typeof parseIdeas>['rows']} rows
 * @param {{ conceptExists: (slug:string)=>boolean, conceptIdeaId: (slug:string)=>string|null, games: string[] }} fs
 * @returns {string[]} errors
 */
export function validateIdeas(rows, fs) {
  const errors = [];
  const seenIds = new Set();
  const seenSlugs = new Set();
  for (const r of rows) {
    const at = `строка ${r.line} (${r.id || 'без ID'})`;
    if (!/^I-\d{3,}$/.test(r.id)) errors.push(`${at}: ID в формате I-001`);
    if (seenIds.has(r.id)) errors.push(`${at}: ID повторяется`);
    seenIds.add(r.id);
    if (!r.title) errors.push(`${at}: пустое название идеи`);
    if (!STATUSES.includes(r.status)) errors.push(`${at}: статус «${r.status}» не из списка: ${STATUSES.join(', ')}`);
    if (r.concept) {
      if (!/^[a-z][a-z0-9-]{1,40}$/.test(r.concept)) errors.push(`${at}: id концепта «${r.concept}» — латиница, цифры, дефис`);
      if (seenSlugs.has(r.concept)) errors.push(`${at}: концепт ${r.concept} указан у двух идей`);
      seenSlugs.add(r.concept);
      if (!fs.conceptExists(r.concept)) errors.push(`${at}: нет файла knowledge/concepts/${r.concept}.md`);
      else if (fs.conceptIdeaId(r.concept) !== r.id)
        errors.push(`${at}: в knowledge/concepts/${r.concept}.md должна быть строка **Идея:** ${r.id}`);
    } else if (NEEDS_CONCEPT.includes(r.status)) {
      errors.push(`${at}: статус «${r.status}» требует концепт в колонке «Концепт»`);
    }
  }
  for (const g of fs.games) {
    const r = rows.find((x) => x.concept === g);
    if (!r) errors.push(`games/${g}: нет идеи с концептом ${g} в knowledge/ideas.md (игра без одобренного концепта)`);
    else if (!GAME_STATUSES.includes(r.status))
      errors.push(`games/${g}: у ${r.id} статус «${r.status}», а игра уже есть (нужно «в разработке» или «выпущена»)`);
  }
  return errors;
}

/** Next free ID after the largest existing one. */
export function nextId(rows) {
  const max = rows.reduce((m, r) => Math.max(m, Number(r.id.replace(/^I-/, '')) || 0), 0);
  return `I-${String(max + 1).padStart(3, '0')}`;
}

/** Replace the status cell of one row, keeping the rest of the file intact. */
export function setStatus(md, id, status) {
  if (!STATUSES.includes(status)) throw new Error(`unknown status ${status}`);
  let done = false;
  const out = md.split('\n').map((line) => {
    const cells = line.split('|');
    if (cells.length > 3 && cells[1].trim() === id) {
      cells[3] = ` ${status} `;
      done = true;
      return cells.join('|');
    }
    return line;
  });
  if (!done) throw new Error(`no idea ${id}`);
  return out.join('\n');
}
