/**
 * Original music-box waltz written for this game (no third-party melody, no samples).
 * 3/4 time. Each bar: melody notes as [note, beats], must add up to 3 beats; chord = bass root + triad.
 */
export const TEMPO_BPM = 100;

export const BARS: { melody: [string, number][]; chord: string[] }[] = [
  { melody: [['A4', 2], ['C5', 1]], chord: ['F2', 'A3', 'C4', 'F4'] },
  { melody: [['Bb4', 1], ['A4', 1], ['G4', 1]], chord: ['C3', 'G3', 'C4', 'E4'] },
  { melody: [['F4', 2], ['A4', 1]], chord: ['F2', 'A3', 'C4', 'F4'] },
  { melody: [['G4', 3]], chord: ['C3', 'G3', 'Bb3', 'E4'] },
  { melody: [['A4', 2], ['C5', 1]], chord: ['F2', 'A3', 'C4', 'F4'] },
  { melody: [['D5', 1], ['C5', 1], ['Bb4', 1]], chord: ['Bb2', 'F3', 'Bb3', 'D4'] },
  { melody: [['A4', 1], ['G4', 1], ['A4', 1]], chord: ['C3', 'G3', 'C4', 'E4'] },
  { melody: [['F4', 3]], chord: ['F2', 'A3', 'C4', 'F4'] },
  { melody: [['D5', 2], ['C5', 1]], chord: ['Bb2', 'F3', 'Bb3', 'D4'] },
  { melody: [['Bb4', 1], ['D5', 1], ['C5', 1]], chord: ['G2', 'D3', 'G3', 'Bb3'] },
  { melody: [['A4', 2], ['G4', 1]], chord: ['F2', 'A3', 'C4', 'F4'] },
  { melody: [['F4', 1], ['G4', 1], ['A4', 1]], chord: ['D3', 'A3', 'D4', 'F4'] },
  { melody: [['Bb4', 2], ['A4', 1]], chord: ['Bb2', 'F3', 'Bb3', 'D4'] },
  { melody: [['G4', 1], ['C5', 1], ['E4', 1]], chord: ['C3', 'G3', 'Bb3', 'E4'] },
  { melody: [['F4', 2], ['C5', 1]], chord: ['F2', 'A3', 'C4', 'F4'] },
  { melody: [['F5', 3]], chord: ['F2', 'C3', 'A3', 'F4'] },
];
