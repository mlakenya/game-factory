# Источники ассетов

Графика сделана в коде этой игры. Звук в сборке для Яндекса синтезируется в коде, в сборке для Playgama
играет файлами из `audio/` (Playgama не принимает синтезированный звук, правило 3.3.2).

- Графика (игрушки, ёлка, звезда, коробка, снег): векторные фигуры Phaser, `src/art.ts`.
- Звуки: синтез WebAudio, `src/sfx.ts`.
- Музыка: оригинальный вальс, написан для этой игры (`content/music.ts`). В сборке для Яндекса играется синтезом WebAudio (`src/music.ts`), в сборке для Playgama — файлом, см. ниже.
- Звуки-файлы (только сборка Playgama), `audio/*.mp3`: те же ноты, что у синтеза (`content/music.ts`, `src/sfx.ts`),
  сыгранные сэмплами музыкальной шкатулки FluidR3 GM (Frank Wen), CC BY 3.0 — **автора указывать**:
  «Music box samples: FluidR3 GM by Frank Wen». https://github.com/gleitz/midi-js-soundfonts
  Рендер: `tools/render-audio.py`.
- Шрифты: системные (`system-ui`), файлов шрифтов нет.
- Сборка для Playgama включает `playgama-bridge.js` — Playgama Bridge SDK (LGPL-3.0, без изменений, отдельным файлом).
