---
name: platform-sdk
description: Как игры работают с площадкой через engine/platform — Yandex SDK и Playgama Bridge, реклама, облачные сохранения, паузы, звук, язык. Применять при написании сцен, кнопок рекламы, сохранений и при правке engine/platform.
---

# engine/platform и сервисы движка

Игры не знают про Яндекс и Playgama. Они получают `GameContext` (см. `templates/blank/src/context.ts`) с сервисами:

| Сервис | Где | Как использовать |
|---|---|---|
| `platform` | `engine/platform` | `gameReady()`, `gameplayStart()`, `gameplayStop()`, `onPauseChange()`, `onAudioChange()`, `lang`, `device` |
| `t` | `engine/i18n` | `ctx.t('key', { n: 5 })`; ключи в `content/locales.ts` |
| `save` | `engine/save` | `ctx.save.get('best')`, `ctx.save.set('best', 10)`; запись с дебаунсом |
| `ads` | `engine/ads` | `await ctx.ads.interstitial()` в паузах; `if (await ctx.ads.rewarded()) награда`; `atEveryPause`, `rewardedAvailable` |
| `audio` | `engine/audio` | `setUserMuted()` для кнопки звука; системный mute делается сам |

## Паттерны
- Сцена активной игры: `gameplayStart()` в `create()`, `gameplayStop()` перед переходом на экран результата/паузы.
- Меню и экраны результата: `gameplayStop()` в `create()` (повторный вызов безопасен).
- Реклама сама ставит игру на паузу (`game.loop.sleep()`) и глушит звук через хуки, переданные в `Ads` в `main.ts`.
- Новое поле сохранения: добавить в `SaveData` и в значения по умолчанию в `main.ts`. Старые сохранения подхватят дефолт.
- Тестам доступны `window.__platform` (у mock есть счётчики `calls`) и `window.__gameReady`.

## Цели сборки: Яндекс и Playgama
Код игры один, площадку выбирает сборка (`--target`, по умолчанию `yandex`):

| Цель | Сборка | SDK | Архив |
|---|---|---|---|
| `yandex` | `dist/<id>` | `<script src="/sdk.js">`, `yandex.ts` | `release/<id>/<id>-ДАТА.zip` |
| `playgama` | `dist/<id>--playgama` | `./playgama-bridge.js` внутри архива + `playgama-bridge-config.json`, `playgama.ts` | `release/<id>/<id>-playgama-ДАТА.zip` |

`npm run pack -- <id> --target playgama` (или `--target all`). `build:all`, `audit -- --all` и e2e проверяют обе цели.
Через Bridge та же сборка идёт на Playgama, CrazyGames, Poki, VK, OK и др.; на Яндексе Bridge сам грузит `/sdk.js`.
Версия Bridge закреплена в `package.json` (`@playgama/bridge`), обновлять осознанно: Playgama требует актуальную версию (1.1.1), а песочница — не ниже 2.2.0.

Правила Playgama, которые отличаются от Яндекса (требования: wiki.playgama.com/playgama/game-requirements):
- **Межстраничная реклама — в каждой естественной паузе, без своих счётчиков и таймеров**: Bridge сам решает, показать ли. В коде: `if (ctx.ads.atEveryPause || свой_счётчик) await ctx.ads.interstitial()`. На Яндексе `atEveryPause` = false, работает свой интервал.
- **Кнопки rewarded прятать**, если `ctx.ads.rewardedAvailable` = false (вне площадки Bridge рекламу не поддерживает).
- **Возрождение за рекламу — не чаще раза за попытку** (2.2.4).
- **Звук площадки**: подписка `platform.onAudioChange` в `main.ts` (см. шаблон) — игра молчит, пока площадка просит, в том числе с самого старта.
- **Английский — язык по умолчанию**, язык только из Bridge (`platform.lang`).
- **Звук должен быть файлами (ogg/mp3)**, синтез WebAudio в коде не принимают (3.3.2). Для Яндекса такого правила нет.
- Название в игре совпадает с названием в форме публикации (3.5.1), только латиница в названии формы.
- Клавишу Esc не использовать (1.5.2), игра заполняет и квадратное окно 1:1 (1.6.8).

## Локальная разработка
- `npm run dev -- <id>` — без SDK автоматически работает `MockPlatform` (реклама = пауза 50 мс, rewarded всегда успешен).
- `?lang=en` — английский, `?mock` — принудительно заглушка даже на площадке.
- `npm run dev -- <id> --target playgama` — с настоящим Bridge в его локальном режиме (реклама не поддерживается, сохранения в браузере); `?mock` переключает на нашу заглушку.
- Проверить на реальном SDK: загрузить архив в консоль как черновик и открыть ссылку для теста.

## Расширение
- Новая площадка — сначала проверить, не покрывает ли её Bridge (тогда это только загрузка в консоль Playgama). Иначе новый класс в `engine/platform/`, цель в `pipeline/targets.mjs` и выбор в `initPlatform`. Игры не меняются.
- Новый метод SDK (лидерборды, покупки) — сначала в интерфейс `Platform`, затем в `yandex.ts`, `playgama.ts` и `mock.ts`, затем юнит-тест (`tests/unit/playgama.test.ts` — пример фейкового Bridge).
- Типы SDK в `yandex.ts` минимальные, дописывать по документации: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about

## Нельзя
- Обращаться к `window.YaGames` или `bridge.*` из `games/` (ловит audit).
- Показывать межстраничную рекламу в `update()` или по таймеру во время игры.
- Писать в localStorage напрямую.
