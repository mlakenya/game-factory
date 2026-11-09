---
name: image-gen
description: Генерация картинок для игр фабрики — единый процесс от промпта до файла в assets: FLUX.2 klein 4B в ComfyUI на ноутбуке человека, задание, запуск, забор, отбор, обработка, лицензии. Применять всякий раз, когда нужна любая картинка для игры, доски стиля, обложки или промо; когда просят «сгенерируй», «нарисуй», «сделай спрайт/фон/иконку».
---

# Генерация картинок

Единственный способ получать картинки для игр. Процесс утвердил человек 2026-11-09 (модель — по итогам замера, см.
[visual-style](../../../knowledge/research/visual-style-2026-11-08.md), раздел 7). Скиллы `art-style` и `assets` решают, *что* рисовать;
этот скилл — *как*.

## Что и где
| Что | Значение |
|---|---|
| Модель | **FLUX.2 klein 4B** fp8 (`flux-2-klein-4b-fp8.safetensors`), Apache 2.0. Энкодер `qwen_3_4b.safetensors`, VAE `flux2-vae.safetensors` |
| Запрещено | klein 9B, FLUX.1 dev, Qwen-Image 2.1 и любые модели без коммерческой лицензии; платные сервисы; бесплатный Recraft (нет прав) |
| Где работает | ноутбук человека desktop-ehdmjhs: RTX 3060 Laptop 6 ГБ, 16 ГБ RAM; ComfyUI в `D:\Gamedev\tools\ComfyUI` |
| Запуск ComfyUI | `D:\Gamedev\tools\ComfyUI\comfy-start.bat` (копия — `pipeline/art/comfy-start.bat`): флаг `--disable-dynamic-vram` обязателен |
| Скрипт | `pipeline/art/generate.py` (stdlib, запускается питоном ComfyUI), проверка готовности — `--check` |
| Папка заданий на ноутбуке | `D:\Gamedev\art-jobs\<id>\<задание>\` (`prompts.json`, `generate.py`, `raw\`, `manifest.json`) |
| Обработка | `pipeline/art/unify.py` в облачной сессии (Pillow): `cut`, `split`, `sheet` |
| Скорость | ~10 с на картинку, пока модель в памяти; до 3 мин, если модель перечитывается с диска. Первая загрузка ~10 мин |
| Запасной путь | Nano Banana 2 в приложении Gemini — только вручную человеком, если klein не справляется (правка по образцу) |

## Процесс
1. **Задание.** Имя задания — `<что>-<дата>`, например `boards-2026-11-12` или `toys-2026-11-13`. Написать
   `art/<id>/jobs/<задание>/prompts.json` по шаблонам ниже. Префикс стиля — из `STYLE.md` (для досок — из черновика направления).
   Размеры кратны 16. На предмет 3–4 варианта (`variants`), на фон 2–3.
2. **Отправка на ноутбук.** Скопировать `prompts.json` и `pipeline/art/generate.py` в
   `/mnt/project-files/art-jobs/<id>/<задание>/` и записать на ноутбук через `device_commit_files` в
   `D:\Gamedev\art-jobs\<id>\<задание>\` (папка `D:\Gamedev` одобрена).
3. **Запуск.** `start_remote_control` в `D:\Gamedev` с текстом из раздела «Поручение для ноутбука». Генерация идёт пачкой,
   ComfyUI не перезапускать между картинками. Пока идёт — человеку одна строка: сколько картинок и примерное время.
4. **Забор.** Когда сессия на ноутбуке отчиталась — `stop_remote_control`, затем `device_stage_files` всех
   `raw\*.png` и `manifest.json` (до 50 файлов за вызов). Положить в `art/<id>/raw/<задание>/` (не коммитится),
   `manifest.json` — в `art/<id>/jobs/<задание>/` (коммитится: промпт и seed каждой картинки).
5. **Отбор.** Claude смотрит каждую картинку и отбирает по чек-листу:
   - один объект, целиком в кадре, фон ровный и светлый (иначе `cut` не вырежет);
   - стиль совпадает с `STYLE.md`: обводка, объём, палитра;
   - нет текста, водяных знаков, лишних предметов, кривых деталей (лишние пальцы, сросшиеся части);
   - читается в размере на экране: уменьшить до реального размера и посмотреть.
   Не прошло ни одного варианта — поправить промпт (что именно не так — в промпт словами) и перегенерировать только эти предметы (`--only`).
6. **Обработка.** `unify.py cut` для отобранных (палитра и обводка из `STYLE.md`, размер 2× от экранного),
   `split` для листов. Результат — в `art/<id>/assets/<группа>/` или `art/<id>/boards/`.
7. **Показ.** `unify.py sheet` → витрина на фоне игры, вложением человеку. Решение о стиле и ассетах — только его.
8. **Учёт.** В `art/<id>/CREDITS.md` строка на группу: `` `toys/` — FLUX.2 klein 4B (Apache 2.0), задание toys-2026-11-13 ``.
   `npm run ideas -- --check` и `audit` проверят, что ни один файл не пропущен.

## Шаблоны промптов
Префикс стиля всегда первым (из `STYLE.md`), дальше по типу. Модель лучше всего слушается коротких конкретных фраз.
| Тип | Шаблон | Размер |
|---|---|---|
| Предмет | `a single <предмет>, <материал и цвет>, <деталь>, centered, plain white background, no text` | 1024×1024 |
| Персонаж | `a single <кто> character, full body, <поза>, <одежда>, facing the viewer, centered, plain white background, no text` | 1024×1024 |
| Состояния | тот же промпт и тот же seed, меняется одно слово (`glowing`, `cracked`, `frozen`) | как у основы |
| Иконка | `a simple bold icon of <что>, thick outline, centered, plain white background, no text` | 1024×1024 |
| Кнопка / панель | `a rounded game UI button, <цвет>, glossy, empty, no text, no icon, plain white background` | 1024×512 |
| Фон портретный | `a <место> game background, <время суток>, <детали>, empty center area for gameplay, no characters, no text` (без «white background») | 768×1344 |
| Фон альбомный | то же | 1344×768 |
Не просить «sprite sheet 3×2»: сетку модель не держит. Лучше по одному предмету на картинку.

## Поручение для ноутбука
Текст для `start_remote_control` (подставить `<id>` и `<задание>`):
```
Generate game art. Do not change system/power/VPN settings, do not close user apps.
1. If ComfyUI is not running on 127.0.0.1:8188, start D:\Gamedev\tools\ComfyUI\comfy-start.bat and wait until it answers.
2. cd D:\Gamedev\art-jobs\<id>\<задание>
3. ..\..\..\tools\ComfyUI\python_embeded\python.exe generate.py --check   (must print OK; on missing models stop and report)
4. ..\..\..\tools\ComfyUI\python_embeded\python.exe generate.py prompts.json --out raw
5. Report: number of images, seconds per image (from manifest.json), any errors. Leave ComfyUI running.
```

## Неполадки
| Признак | Что делать |
|---|---|
| ~12 с на шаг, видеокарта загружена на 4% | ComfyUI запущен без `--disable-dynamic-vram` — перезапустить через `comfy-start.bat` |
| 2–3 минуты на картинку | не хватает RAM: человеку предложить закрыть тяжёлые программы; `--clip qwen_3_4b_fp8_mixed.safetensors` (5,25 ГБ, Apache 2.0) |
| Out of memory | уменьшить размер (768×768), закрыть программы, крайний случай — запуск ComfyUI с `--lowvram` |
| `--check` не находит модель | не скачивать другую модель самовольно; сообщить человеку и сверить лицензию на Hugging Face |
| Ноутбук не отвечает | см. скилл `windows-home-laptop`; генерацию не переносить в платные сервисы |

## Правила
- Только этот процесс. Рисовать предметы и персонажей кодом нельзя, только эффекты (частицы, вспышки).
- Каждая картинка в игре прослеживается: `manifest.json` (промпт, seed) → файл → строка в `CREDITS.md`.
- Ноутбук стоит в шкафу и шумит под нагрузкой: большие пачки (больше ~50 картинок) — предупредить человека.
- Вывод из этого процесса после каждой игры — в этот скилл (скилл `learn`): удачные промпты, неполадки, время.
