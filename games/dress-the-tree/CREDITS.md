# Источники ассетов

Графика сделана в коде этой игры. Звук в сборке для Яндекса синтезируется в коде, в сборке для Playgama
играет файлами из `audio/` (Playgama не принимает синтезированный звук, правило 3.3.2).

- Графика (игрушки, ёлка, звезда, коробка, снег): векторные фигуры Phaser, `src/art.ts`.
- Звуки: синтез WebAudio, `src/sfx.ts`.
- Музыка: оригинальный вальс, написан для этой игры (`content/music.ts`). В сборке для Яндекса играется синтезом WebAudio (`src/music.ts`), в сборке для Playgama — файлом, см. ниже.
- Звуки-файлы (только сборка Playgama), `audio/*.mp3`, перекодированы в mp3 с выравниванием громкости:
  - `pick`, `drop`, `deny`, `creak`, `thaw` — Kenney, Interface Sounds (pluck_001, glass_001, error_004, glass_004, glass_005), CC0. https://kenney.nl/assets/interface-sounds
  - `triple`, `fall`, `win` — Kenney, Music Jingles (jingles_pizzi_16, jingles_pizzi_1, jingles_steel_2), CC0. https://kenney.nl/assets/music-jingles
  - `music` — наш вальс из `content/music.ts`, сыгранный сэмплами музыкальной шкатулки FluidR3 GM (Frank Wen), CC BY 3.0: «Music box samples: FluidR3 GM by Frank Wen». https://github.com/gleitz/midi-js-soundfonts — рендер `tools/render-music.py`.
- Шрифты: системные (`system-ui`), файлов шрифтов нет.
- Сборка для Playgama включает `playgama-bridge.js` — Playgama Bridge SDK (LGPL-3.0, без изменений, отдельным файлом).
