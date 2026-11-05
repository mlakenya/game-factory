/**
 * Toy kinds. The shape tells the weight: ball = light, pine cone = medium, bell = heavy.
 * Colors are drawn in code (no image files), see src/art.ts.
 */
export type ToyShape = 'ball' | 'cone' | 'bell';
export interface ToyKind { shape: ToyShape; color: number; accent: number }

export const WEIGHT: Record<ToyShape, number> = { ball: 1, cone: 2, bell: 3 };

export const TOYS: ToyKind[] = [
  { shape: 'ball', color: 0xff2d55, accent: 0xffd1dc }, // 0 red ball
  { shape: 'ball', color: 0x1e90ff, accent: 0xcfe8ff }, // 1 blue ball
  { shape: 'ball', color: 0xffc400, accent: 0xfff4c2 }, // 2 gold ball
  { shape: 'ball', color: 0xf8f9fa, accent: 0x4dabf7 }, // 3 white ball with blue stripe
  { shape: 'cone', color: 0xb5651d, accent: 0xf2b872 }, // 4 brown pine cone
  { shape: 'cone', color: 0xc9d6e3, accent: 0xffffff }, // 5 silver pine cone
  { shape: 'cone', color: 0xff3fa4, accent: 0xffc2e2 }, // 6 pink pine cone
  { shape: 'bell', color: 0xffcc00, accent: 0xfff3a3 }, // 7 gold bell
  { shape: 'bell', color: 0xff3b30, accent: 0xffb3ad }, // 8 red bell
  { shape: 'bell', color: 0x9b5cff, accent: 0xe0ccff }, // 9 purple bell
];

export const TOY_WEIGHTS = TOYS.map((t) => WEIGHT[t.shape]);
