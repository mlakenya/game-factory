import { describe, expect, it } from 'vitest';
import { nextId, parseIdeas, setStatus, validateIdeas } from '../../pipeline/ideas-lib.mjs';

const md = (rows: string) => `# Реестр

| ID | Идея | Статус | Скан | Концепт | Заметка |
|---|---|---|---|---|---|
${rows}
`;

const fs = (over: Partial<Parameters<typeof validateIdeas>[1]> = {}) => ({
  conceptExists: () => true,
  conceptIdeaId: () => 'I-001',
  games: [] as string[],
  ...over,
});

describe('idea registry', () => {
  it('parses rows and concept links', () => {
    const { rows, errors } = parseIdeas(md('| I-001 | Ёлка | концепт | — | [dress-tree](concepts/dress-tree.md) | — |'));
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ id: 'I-001', status: 'концепт', concept: 'dress-tree', note: '' });
  });

  it('accepts a plain idea without concept', () => {
    const { rows } = parseIdeas(md('| I-001 | Ёлка | идея | — | — | — |'));
    expect(validateIdeas(rows, fs())).toEqual([]);
  });

  it('rejects unknown status, duplicate id and missing concept', () => {
    const { rows } = parseIdeas(md('| I-001 | A | готово | — | — | — |\n| I-001 | B | одобрен | — | — | — |'));
    const errors = validateIdeas(rows, fs()).join('\n');
    expect(errors).toMatch(/статус «готово»/);
    expect(errors).toMatch(/ID повторяется/);
    expect(errors).toMatch(/требует концепт/);
  });

  it('requires the concept file to point back to its idea', () => {
    const { rows } = parseIdeas(md('| I-002 | A | концепт | — | [a-game](concepts/a-game.md) | — |'));
    expect(validateIdeas(rows, fs()).join()).toMatch(/\*\*Идея:\*\* I-002/);
    expect(validateIdeas(rows, fs({ conceptExists: () => false })).join()).toMatch(/нет файла/);
  });

  it('rejects a game folder without an approved, in-development idea', () => {
    const { rows } = parseIdeas(md('| I-001 | A | одобрен | — | [a-game](concepts/a-game.md) | — |'));
    expect(validateIdeas(rows, fs({ games: ['a-game'] })).join()).toMatch(/статус «одобрен», а игра уже есть/);
    expect(validateIdeas(rows, fs({ games: ['other'] })).join()).toMatch(/games\/other: нет идеи/);
    const dev = parseIdeas(md('| I-001 | A | в разработке | — | [a-game](concepts/a-game.md) | — |')).rows;
    expect(validateIdeas(dev, fs({ games: ['a-game'] }))).toEqual([]);
  });

  it('gives the next id and changes status in place', () => {
    const text = md('| I-001 | A | идея | — | — | — |\n| I-007 | B | идея | — | — | x |');
    expect(nextId(parseIdeas(text).rows)).toBe('I-008');
    const changed = setStatus(text, 'I-007', 'отложена');
    expect(parseIdeas(changed).rows[1]).toMatchObject({ status: 'отложена', note: 'x' });
    expect(() => setStatus(text, 'I-009', 'идея')).toThrow();
  });
});
