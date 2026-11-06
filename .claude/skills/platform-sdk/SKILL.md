---
name: platform-sdk
description: Как игры работают с площадкой через engine/platform — Yandex SDK, Playgama Bridge и CrazyGames SDK, реклама, облачные сохранения, паузы, звук, язык. Применять при написании сцен, кнопок рекламы, сохранений и при правке engine/platform.
---

# engine/platform и сервисы движка

Игры не знают про Яндекс, Playgama и CrazyGames. Они получают `GameContext` (см. `templates/blank/src/context.ts`) с сервисами:

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

## Цели сборки: Яндекс, Playgama, CrazyGames
Код игры один, площадку выбирает сборка (`--target`, по умолчанию `yandex`):

| Цель | Сборка | SDK | Архив |
|---|---|---|---|
| `yandex` | `dist/<id>` | `<script src="/sdk.js">`, `yandex.ts` | `release/<id>/<id>-ДАТА.zip` |
| `playgama` | `dist/<id>--playgama` | `./playgama-bridge.js` внутри архива + `playgama-bridge-config.json`, `playgama.ts` | `release/<id>/<id>-playgama-ДАТА.zip` |
| `crazygames` | `dist/<id>--crazygames` | SDK v3 с `sdk.crazygames.com` (грузит `crazygames.ts` при старте, с `?mock` не грузит) | `release/<id>/<id>-crazygames-ДАТА.zip` |

`npm run pack -- <id> --target playgama|crazygames` (или `--target all`). `build:all`, `audit -- --all` и e2e проверяют все цели.
Через Bridge та же сборка идёт на Playgama, Poki, VK, OK и др.; на Яндексе Bridge сам грузит `/sdk.js`.
На CrazyGames — своя цель, не Bridge: Bridge берёт язык из `countryCode` (страна, а не язык), не умеет `muteAudio`
и `loadingStart/Stop`, а SDK всё равно грузит с CDN CrazyGames.
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

Правила CrazyGames (docs.crazygames.com/requirements, изучены 2026-11-06):
- **Запуск в два этапа.** Basic Launch: SDK не обязателен, реклама выключена (ошибка `adsDisabled`), 7–21 день
  и ≥ 500 игр, смотрят время сессии (цель 10+ мин), D1 retention (10–15 %), конверсию (80 %+). Сильные игры
  зовут в Full Launch: SDK обязателен, реклама, Data module, сразу в игру (максимум один клик).
- **Rewarded в `crazygames.ts` выключен** (`rewardedSupported = false`): в Basic Launch кнопка без рекламы — отказ, а
  CrazyGames запрещает кнопку rewarded на экране активной игры и предложение возрождения после каждой смерти.
  Перед Full Launch пересмотреть: перенести бустеры с игрового экрана, ограничить возрождение.
- **Midgame** — в каждой естественной паузе, SDK сам режет до раза в 3 минуты (`adsPacedByPlatform`). Звук глушить
  только с `adStarted`, а не при запросе; UI держать заблокированным до `adFinished`/`adError`.
- **Звук:** `settings.muteAudio` сильнее кнопок звука в игре → приходит как `onAudioChange(false)`. Звук файлами, как у Playgama.
- **Язык:** `user.systemInfo.locale` (`ru-RU` → `ru`), иначе английский. Английский обязателен.
- **Сохранения:** Data module (как localStorage, до 1 МБ); работает, только если в форме выбрано Progress Save →
  «Yes, using the Data Module». Иначе адаптер пишет в localStorage.
- **Своя кнопка полного экрана запрещена** (ловит audit), Esc и Ctrl+W не использовать.
- Текст читается при `devicePixelRatio: 1` в окне 907×510 (вертикальная игра там ~0,4 масштаба: шрифт ≥ 30 px).
- Лимиты: начальная загрузка ≤ 50 МБ (до первого `gameplayStart`), всего ≤ 250 МБ, ≤ 1500 файлов.
- Без кросс-промо и ссылок на другие площадки/магазины приложений. Аудитория 13+ (PEGI 12).
- Обложки: 1920×1080, 800×1200, 800×800, только название игры как текст, без рамок и «Play». Видео 15–20 с,
  ≤ 50 МБ, без звука, 1080p 16:9 и 2:3, первый кадр = обложка, без курсора и чёрных полос.
  Для «Наряди ёлку»: `tools/compose-covers.cjs crazygames`, `tools/preview/`.
- Выплаты через Tipalti от 100 €; работает ли Россия — не подтверждено.

## Локальная разработка
- `npm run dev -- <id>` — без SDK автоматически работает `MockPlatform` (реклама = пауза 50 мс, rewarded всегда успешен).
- `?lang=en` — английский, `?mock` — принудительно заглушка даже на площадке.
- `npm run dev -- <id> --target playgama` — с настоящим Bridge в его локальном режиме (реклама не поддерживается, сохранения в браузере); `?mock` переключает на нашу заглушку.
- `npm run dev -- <id> --target crazygames` — на localhost SDK CrazyGames сам в режиме `local` (демо-реклама). `?rewarded=0` прячет rewarded у заглушки.
- Проверить на реальном SDK: загрузить архив в консоль как черновик и открыть ссылку для теста (CrazyGames: Preview в кабинете разработчика).

## Расширение
- Новая площадка — сначала проверить, не покрывает ли её Bridge (тогда это только загрузка в консоль Playgama). Иначе новый класс в `engine/platform/`, цель в `pipeline/targets.mjs` и выбор в `initPlatform`. Игры не меняются.
- Новый метод SDK (лидерборды, покупки) — сначала в интерфейс `Platform`, затем в `yandex.ts`, `playgama.ts`, `crazygames.ts` и `mock.ts`, затем юнит-тест (`tests/unit/playgama.test.ts` — пример фейкового Bridge).
- Типы SDK в `yandex.ts` минимальные, дописывать по документации: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about

## Нельзя
- Обращаться к `window.YaGames`, `bridge.*` или `CrazyGames.SDK` из `games/` (ловит audit).
- Показывать межстраничную рекламу в `update()` или по таймеру во время игры.
- Писать в localStorage напрямую.
