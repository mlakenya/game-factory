# game-factory

Фабрика веб-игр для Яндекс Игр на Phaser 4 + TypeScript, которую ведёт Claude.
Общий движок, жанровые шаблоны, игры, конвейер сборки и база знаний в одном репозитории.

## Быстрый старт
```bash
npm install
npx playwright install chromium     # один раз, для e2e
npm run dev -- blank                # шаблон в браузере
npm run new-game -- my-game         # новая игра в games/my-game
npm run dev -- my-game
npm run check                       # то же, что CI
npm run pack -- my-game             # zip для консоли Яндекс Игр
```

## Как устроено
Правила для Claude и карта репозитория — в [CLAUDE.md](CLAUDE.md). Подробнее:
[engine/](engine/README.md), [pipeline/](pipeline/README.md), [knowledge/](knowledge/README.md), скиллы в `.claude/skills/`.

## Конвейер одной игры
1. **Сигнал рынка** — ежедневный скан трендов (`knowledge/market/`), по понедельникам недельная сводка.
2. **Карточка концепта** — `CONCEPT.md`, решает человек.
3. **Сборка из шаблона** — скилл `new-game`.
4. **Разработка** — ветка `game/<id>`, отдельный тред Claude.
5. **Автопроверки** — CI: типы, юнит, сборка, аудит требований Яндекса, Playwright на десктопе и телефоне.
6. **Плейтест** — агент `playtester` + 10 минут человека.
7. **Пакет релиза** — `npm run pack` + скилл `release-pack`.
8. **Модерация** — отправляет человек.
9. **Метрики и постмортем** через 3 недели — скилл `postmortem`.
