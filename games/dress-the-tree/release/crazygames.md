# Dress the Tree на CrazyGames: что загружать и как

Загружает человек: у CrazyGames нет API для загрузки, всё делается в кабинете https://developer.crazygames.com.
Логин и пароль Claude не нужны.

## Файлы

| Что | Файл |
|---|---|
| Архив игры | `dress-the-tree-crazygames-ДАТА.zip` (`npm run pack -- dress-the-tree --target crazygames`), index.html в корне |
| Обложка 16:9, 1920×1080 | `media/crazygames/cover-landscape.png` |
| Обложка 2:3, 800×1200 | `media/crazygames/cover-portrait.png` |
| Обложка 1:1, 800×800 | `media/crazygames/cover-square.png` |
| Видео 16:9, 1920×1080, 16,6 с, без звука | `media/crazygames/preview-landscape.mp4` |
| Видео 2:3, 1080×1620, 16,6 с, без звука | `media/crazygames/preview-portrait.mp4` |

Обложки и видео пересобираются: `node tools/compose-covers.cjs crazygames`, затем запись и склейка по `tools/preview/preview.config.ts`.

## Поля формы (на английском)

**Game name:** Dress the Tree

**Description:**
A cozy New Year sorting puzzle with a twist: balance. Drag toys from hook to hook, and three of a kind on one branch fly into the gift box. But the tree stands on a single trunk, and heavy toys pull it to their side. Bells are heavier than pine cones, pine cones are heavier than balls, and the farther from the trunk, the stronger the lean. Lean too far and the star falls off the top.

- 30 levels with new rules introduced one at a time: weight and tilt, toys hidden behind the needles, snowy branches.
- The tilt meter shows where the tree will lean before you let go of a toy.
- Up to three stars per level: the straighter the tree, the more stars.
- No timer, play at your own pace, with calm music-box music and a countdown to New Year.

**Controls:**
Mouse: drag a toy to a free hook, or click a toy and then a hook.
Touch: drag, or tap a toy and then a hook.

**Credits (если есть поле или в конец описания):** Music box samples: FluidR3 GM by Frank Wen (CC BY 3.0).

**Category / tags:** Puzzle; tags: sorting, match 3, christmas, casual, relaxing.

## Настройки в форме
- **Engine / type:** HTML5.
- **Mobile:** да, игра работает на телефоне и планшете. **Orientation:** Portrait.
- **Progress save:** «Yes, using the Data Module from the CrazyGames SDK». Без этого сохранения пойдут только в браузер.
- **SDK:** интегрирован (gameplayStart/Stop, loadingStart/Stop, midgame-реклама, Data module, muteAudio).
- **Multiplayer / in-game purchases / account login:** нет.
- **Already released elsewhere:** да, Playgama (если спрашивают). Эксклюзив CrazyGames не требует.

## Шаги
1. developer.crazygames.com → Games → **Submit a game** (или «Add game»).
2. Заполнить название, описание, управление, категорию по разделу выше.
3. Загрузить архив zip. Если форма просит папку, распаковать zip и перетащить содержимое (index.html и assets/).
4. Загрузить три обложки и два видео.
5. Открыть **Preview** (QA tool): проверить, что игра стартует сразу в меню, «Play» ведёт в уровень, после победы
   «Next» не зависает (реклама в Basic Launch выключена, игра идёт дальше), прогресс сохраняется после перезагрузки,
   звук выключается переключателем звука сайта. В QA tool посмотреть, что SDK-события приходят без ошибок.
6. Отправить на проверку (Submit). Дальше Basic Launch на 7–21 день; по метрикам CrazyGames решает про Full Launch.

## Что сделать перед Full Launch (если позовут)
- Rewarded сейчас выключен на CrazyGames. Чтобы его включить, кнопки «+ крючок» и «Перемешать» убрать с игрового
  экрана (CrazyGames запрещает rewarded на экране активной игры) и не предлагать «Вернуть звезду» после каждого падения.
- Перепроверить читаемость мелких надписей в окне 907×510.
