# Источники ассетов

Графика сделана в коде этой игры. Звук в сборке для Яндекса синтезируется в коде, в сборке для Playgama
играет файлами из `audio/` (Playgama не принимает синтезированный звук, правило 3.3.2).

- Графика (игрушки, ёлка, звезда, коробка, снег): векторные фигуры Phaser, `src/art.ts`.
- Звуки: синтез WebAudio, `src/sfx.ts`.
- Музыка: оригинальный вальс, написан для этой игры (`content/music.ts`), играется синтезом WebAudio (`src/music.ts`). Чужих мелодий и сэмплов нет.
- Звуки-файлы (только сборка Playgama), `audio/*.mp3`, перекодированы в mp3 с выравниванием громкости:
  - `pick`, `drop`, `deny`, `creak`, `thaw` — Kenney, Interface Sounds (pluck_001, glass_001, error_004, glass_004, glass_005), CC0. https://kenney.nl/assets/interface-sounds
  - `triple`, `fall`, `win` — Kenney, Music Jingles (jingles_pizzi_16, jingles_pizzi_1, jingles_steel_2), CC0. https://kenney.nl/assets/music-jingles
  - `music` — «Carol of the Bells» в аранжировке Tanner Helland, CC BY 4.0, **автора нужно указывать**: «Music by Tanner Helland (tannerhelland.com)». https://github.com/tannerhelland/free-music
- Шрифты: системные (`system-ui`), файлов шрифтов нет.
- Сборка для Playgama включает `playgama-bridge.js` — Playgama Bridge SDK (LGPL-3.0, без изменений, отдельным файлом).
