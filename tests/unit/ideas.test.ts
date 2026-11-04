import { describe, expect, it } from 'vitest';
import { nextId, parseIdeas, setStatus, validateIdeas } from '../../pipeline/ideas-lib.mjs';

const md = (rows: string) => `# Реестр

| № | Идея | Статус | Скан | Концепт | Заметка |
|---|---|---|---|---|---|
${rows}
`;

const fs = (over: Partial<Parameters<typeof validateIdeas>[1]> = {}) => ({
  conceptExists: () => true,
  conceptIdeaId: () => '1',
  games: [] as string[],
  ...over,
});

describe('idea registry', () => {
  it('parses rows and concept links', () => {
    const { rows, errors } = parseIdeas(md('| 1 | Ёлка | концепт | — | [dress-tree](concepts/dress-tree.md) | — |'));
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ id: '1', status: 'концепт', concept: 'dress-tree', note: '' });
  });

  it('accepts a plain idea without concept', () => {
    const { rows } = parseIdeas(md('| 1 | Ёлка | идея | — | — | — |'));
    expect(validateIdeas(rows, fs())).toEqual([]);
  });

  it('rejects unknown status, duplicate id and missing concept', () => {
    const { rows } = parseIdeas(md('| 1 | A | готово | — | — | — |\n| 1 | B | одобрен | — | — | — |'));
    const errors = validateIdeas(rows, fs()).join('\n');
    expect(errors).toMatch(/статус «готово»/);
    expect(errors).toMatch(/номер повторяется/);
    expect(errors).toMatch(/требует концепт/);
  });

  it('requires the concept file to point back to its idea', () => {
    const { rows } = parseIdeas(md('| 2 | A | концепт | — | [a-game](concepts/a-game.md) | — |'));
    expect(validateIdeas(rows, fs()).join()).toMatch(/\*\*Идея:\*\* 2/);
    expect(validateIdeas(rows, fs({ conceptExists: () => false })).join()).toMatch(/нет файла/);
  });

  it('rejects a game folder without an approved, in-development idea', () => {
    const { rows } = parseIdeas(md('| 1 | A | одобрен | — | [a-game](concepts/a-game.md) | — |'));
    expect(validateIdeas(rows, fs({ games: ['a-game'] })).join()).toMatch(/статус «одобрен», а игра уже есть/);
    expect(validateIdeas(rows, fs({ games: ['other'] })).join()).toMatch(/games\/other: нет идеи/);
    const dev = parseIdeas(md('| 1 | A | в разработке | — | [a-game](concepts/a-game.md) | — |')).rows;
    expect(validateIdeas(dev, fs({ games: ['a-game'] }))).toEqual([]);
  });

  it('gives the next id and changes status in place', () => {
    const text = md('| 1 | A | идея | — | — | — |\n| 7 | B | идея | — | — | x |');
    expect(nextId(parseIdeas(text).rows)).toBe('8');
    const changed = setStatus(text, '7', 'отложена');
    expect(parseIdeas(changed).rows[1]).toMatchObject({ status: 'отложена', note: 'x' });
    expect(() => setStatus(text, '9', 'идея')).toThrow();
  });
});

describe('setStatus', () => {
  it('only touches the registry table, not other tables with the same first cell', () => {
    const text = `| Шаг | Что |\n|---|---|\n| 1 | идея |\n\n` + md('| 1 | A | идея | — | — | — |');
    const changed = setStatus(text, '1', 'отклонена');
    expect(changed).toContain('| 1 | идея |');
    expect(parseIdeas(changed).rows[0].status).toBe('отклонена');
  });
});
