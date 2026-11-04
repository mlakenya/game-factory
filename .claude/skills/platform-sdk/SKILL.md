---
name: platform-sdk
description: Как игры работают с площадкой через engine/platform — Yandex SDK, реклама, облачные сохранения, паузы, язык. Применять при написании сцен, кнопок рекламы, сохранений и при правке engine/platform.
---

# engine/platform и сервисы движка

Игры не знают про Яндекс. Они получают `GameContext` (см. `templates/blank/src/context.ts`) с сервисами:

| Сервис | Где | Как использовать |
|---|---|---|
| `platform` | `engine/platform` | `gameReady()`, `gameplayStart()`, `gameplayStop()`, `lang`, `device` |
| `t` | `engine/i18n` | `ctx.t('key', { n: 5 })`; ключи в `content/locales.ts` |
| `save` | `engine/save` | `ctx.save.get('best')`, `ctx.save.set('best', 10)`; запись с дебаунсом |
| `ads` | `engine/ads` | `await ctx.ads.interstitial()` в паузах; `if (await ctx.ads.rewarded()) награда` |
| `audio` | `engine/audio` | `setUserMuted()` для кнопки звука; системный mute делается сам |

## Паттерны
- Сцена активной игры: `gameplayStart()` в `create()`, `gameplayStop()` перед переходом на экран результата/паузы.
- Меню и экраны результата: `gameplayStop()` в `create()` (повторный вызов безопасен).
- Реклама сама ставит игру на паузу (`game.loop.sleep()`) и глушит звук через хуки, переданные в `Ads` в `main.ts`.
- Новое поле сохранения: добавить в `SaveData` и в значения по умолчанию в `main.ts`. Старые сохранения подхватят дефолт.
- Тестам доступны `window.__platform` (у mock есть счётчики `calls`) и `window.__gameReady`.

## Локальная разработка
- `npm run dev -- <id>` — без SDK автоматически работает `MockPlatform` (реклама = пауза 50 мс, rewarded всегда успешен).
- `?lang=en` — английский, `?mock` — принудительно заглушка даже на площадке.
- Проверить на реальном SDK: загрузить архив в консоль как черновик и открыть ссылку для теста.

## Расширение
- Новая площадка (Playgama Bridge, VK Play) — новый класс в `engine/platform/`, реализующий `Platform`, и выбор в `initPlatform`. Игры не меняются.
- Новый метод SDK (лидерборды, покупки) — сначала в интерфейс `Platform`, затем в `yandex.ts` и `mock.ts`, затем юнит-тест.
- Типы SDK в `yandex.ts` минимальные, дописывать по документации: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about

## Нельзя
- Обращаться к `window.YaGames` из `games/` (ловит audit).
- Показывать межстраничную рекламу в `update()` или по таймеру во время игры.
- Писать в localStorage напрямую.
