export interface IdeaRow { line: number; id: string; title: string; status: string; scan: string; concept: string; note: string }
export interface ValidateFs {
  conceptExists(slug: string): boolean;
  conceptIdeaId(slug: string): string | null;
  games: string[];
  styleExists?(slug: string): boolean;
  assetProblems?(slug: string): string[];
}
export const STATUSES: string[];
export const NEEDS_CONCEPT: string[];
export const NEEDS_STYLE: string[];
export const NEEDS_ASSETS: string[];
export const GAME_STATUSES: string[];
export const COLUMNS: string[];
export function conceptSlug(raw: string): string;
export function parseIdeas(md: string): { rows: IdeaRow[]; errors: string[] };
export function validateIdeas(rows: IdeaRow[], fs: ValidateFs): string[];
export function nextId(rows: IdeaRow[]): string;
export function setStatus(md: string, id: string, status: string): string;
