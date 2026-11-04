/**
 * Toy kinds. The shape tells the weight: ball = light, pine cone = medium, bell = heavy.
 * Colors are drawn in code (no image files), see src/art.ts.
 */
export type ToyShape = 'ball' | 'cone' | 'bell';
export interface ToyKind { shape: ToyShape; color: number; accent: number }

export const WEIGHT: Record<ToyShape, number> = { ball: 1, cone: 2, bell: 3 };

export const TOYS: ToyKind[] = [
  { shape: 'ball', color: 0xe03131, accent: 0xffc9c9 }, // 0 red ball
  { shape: 'ball', color: 0x1c7ed6, accent: 0xa5d8ff }, // 1 blue ball
  { shape: 'ball', color: 0xf59f00, accent: 0xffec99 }, // 2 gold ball
  { shape: 'ball', color: 0x2f9e44, accent: 0xb2f2bb }, // 3 green ball
  { shape: 'cone', color: 0x8d5524, accent: 0xd9a066 }, // 4 brown pine cone
  { shape: 'cone', color: 0xadb5bd, accent: 0xf8f9fa }, // 5 silver pine cone
  { shape: 'cone', color: 0xd6336c, accent: 0xfcc2d7 }, // 6 pink pine cone
  { shape: 'bell', color: 0xfab005, accent: 0xfff3bf }, // 7 gold bell
  { shape: 'bell', color: 0xc92a2a, accent: 0xffa8a8 }, // 8 red bell
  { shape: 'bell', color: 0x7048e8, accent: 0xd0bfff }, // 9 purple bell
];

export const TOY_WEIGHTS = TOYS.map((t) => WEIGHT[t.shape]);
