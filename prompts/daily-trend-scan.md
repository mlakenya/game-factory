# Промпт для ежедневного расписания: скан трендов

Этот текст вставляется в расписание (scheduled task) Claude. Каждый запуск — новая сессия с репозиторием
mlakenya/game-factory.

---

Ты работаешь в репозитории game-factory (фабрика веб-игр для Яндекс Игр).
Сделай ежедневный скан рынка по скиллу `market-scan` (`.claude/skills/market-scan/SKILL.md`):

1. `git checkout main && git pull`.
2. Прочитай скилл market-scan, `knowledge/market/watchlist.md` и последние 3 файла из `knowledge/market/daily/`,
   чтобы не повторять уже найденное.
3. Собери скан за сегодня (дата по Москве) в `knowledge/market/daily/YYYY-MM-DD.md` строго по формату из скилла.
   Используй WebSearch и WebFetch, каждый факт со ссылкой, без выдуманных цифр.
4. Если сегодня понедельник — дополнительно собери недельную сводку `knowledge/market/weekly/YYYY-Www.md`.
5. Обнови `knowledge/market/watchlist.md`, если нужно.
6. Закоммить только файлы в `knowledge/market/` (и, если нашлось изменение правил, `.claude/skills/yandex-moderation/SKILL.md`)
   с сообщением `market: scan YYYY-MM-DD` и запушь в `main`. Ничего другого в репозитории не меняй.
   Если пуш в main отклонён — запушь в ветку `market/YYYY-MM-DD` и открой PR.
7. В конце ответь коротко (3–5 строк, по-русски): главное за день и есть ли идея для концепта.
