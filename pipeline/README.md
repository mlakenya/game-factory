# pipeline/

| Команда | Скрипт | Что делает |
|---|---|---|
| `npm run dev -- <id>` | `run.mjs dev` | Dev-сервер игры или шаблона |
| `npm run build -- <id>` / `build:all` | `run.mjs build` | Сборка в `dist/<id>/` |
| `npm run new-game -- <id> [--template blank]` | `new-game.mjs` | Новая игра из шаблона |
| `npm run audit -- <id>` / `-- --all` | `audit.mjs` | Линтер требований Яндекса по сборке |
| `npm run pack -- <id>` | `pack.mjs` | build + audit + zip в `release/<id>/` |
| — | `serve.mjs` | Статический сервер `dist/` для Playwright |

Планы (появятся, когда будет что автоматизировать): `capture.mjs` (скриншоты/видео для каталога через Playwright),
`promo.mjs` (иконки и обложки нужных размеров). См. reference: github.com/ajvar010-beep/yandex-games-farm.
