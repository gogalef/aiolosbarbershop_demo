# Aiolos Barbershop — восстановление сайта

Источник: Wayback Machine, снапшот `20250406185130` (www.aiolosbarbershop.gr).

## На чём был сайт

В архиве две разные версии:

| Период | Платформа | Детали |
|---|---|---|
| 2019 – конец 2021 | **WordPress** | тема *Bridge* (Qode), WPBakery (js_composer), Revolution Slider. Автор — Shredzigns Athens |
| 2023 – апрель 2025 (последний снапшот 2025-04-09) | **Joomla 4/5** | шаблон *Shaper Qubic* (JoomShaper) на фреймворке *Helix3*, **SP Page Builder**, Bootstrap, jQuery, Font Awesome 5, шрифт Raleway, Cloudflare перед сайтом. Автор — Opertum.io |

Актуальная (Joomla) версия — одностраничный лендинг, без бэкенд-логики: запись идёт через внешний сервис Setmore, карта — iframe Snazzy Maps. То есть CMS по сути не нужна, и сайт целиком воспроизводится статикой.

## Что лежит в `archive/`

- `archive/www/` — статическое зеркало Joomla-версии (все файлы со статусом 200 из архива, оригиналы через `id_`). Открывается локально и выглядит как оригинал.
  - Font Awesome 5 webfonts в архиве не сохранились — дополнены с cdnjs (v5.15.4) в `templates/shaper_qubic/fonts/` и `components/com_sppagebuilder/assets/webfonts/`.
  - Мусор от краулера (листинги `administrator/`, `cache/`, `cli/`… и остатки `wp-content/` старой версии) тоже лежит там — для чистого сайта не нужен.
- `archive/wordpress-2021/index.html` — главная старой WP-версии (только для справки по контенту).
- `archive/mirror-log.txt` — лог выкачки.

Запуск локально: конфигурация `archive-joomla` в `.claude/launch.json` (`npx http-server archive/www -p 8080`).

## Новый сайт

Чистая статика без jQuery, Bootstrap, Font Awesome и CMS. Готовый билд можно выкладывать на любой хостинг (Cloudflare Pages, Netlify, обычный FTP).

```
content/services.yml   ← услуги и цены (единственное, что правится руками)
src/                   ← исходники: index.html (шаблон), assets/css, fonts, img
tools/build.mjs        ← сборка
dist/                  ← готовый продакшен-билд (генерируется, в git не хранится)
```

| Команда | Что делает |
|---|---|
| `npm install` | один раз после клонирования |
| `npm run build` | собирает `dist/` — его и выкладывать на хостинг |
| `npm run dev` | собирает, пересобирает при любом изменении в `src/` и `content/`, раздаёт на http://localhost:8081 |
| `npm run images` | пересоздаёт картинки в `src/assets/img` из оригиналов в `archive/` |

Что делает сборка: проверяет `services.yml` (при ошибке — сообщение с номером строки или названием услуги, а `dist/` остаётся прежним), вставляет прайс в HTML, считает диапазон цен для schema.org, встраивает CSS в страницу, минифицирует HTML/CSS/JS, копирует шрифты и картинки, генерирует `robots.txt` и `sitemap.xml`.

### Как поменять цены и услуги

Открыть [content/services.yml](content/services.yml) — инструкция есть в начале файла. Коротко:

```yaml
- category: Haircuts          # новая группа
  services:
    - name: Men's Haircut     # услуга
      duration: 30 min        # необязательно
      price: 15               # → «€15»; можно текстом: from 15 → «from €15»
```

Потом `npm run build` и выложить `dist/`. Если сайт будет на Cloudflare Pages или Netlify с подключённым git-репозиторием, достаточно сохранить файл в репозиторий (хоть через веб-интерфейс GitHub) — хостинг сам запустит `npm run build`. Следующий шаг при желании — Decap CMS: веб-форма для редактирования этого же файла, без git и текстовых редакторов.

### Дизайн и техника

- **Шрифты** (свои файлы, без запросов к Google):
  - *Sancreek* — заголовки разделов. Узкий викторианский шрифт со шпорами на штрихах, как надпись «ΑΙΟΛΟΣ» на логотипе.
  - *Roboto Slab* — подписи, меню и основной текст. Брусковый шрифт, как «BARBER SHOP» на ленте логотипа, но спокойный и хорошо читается. Есть греческий (нужен для адреса).
- **Прайс** — HTML-текст в стиле таблички логотипа: двойная рамка, уголки-орнаменты, лента «Price List», точечные выноски до цены.
- **Картинки** — WebP, адаптивные размеры ([tools/optimize-images.mjs](tools/optimize-images.mjs)).
- **Карта** — встроенная Google Maps без ключа (координаты из старой карты Snazzy Maps), загружается лениво.
- Добавлены meta description, Open Graph и разметка schema.org (HairSalon).
- Убраны: видео-фон (7 МБ) и мёртвые пункты меню About/Works.

Вес первой загрузки на мобильном — около 300 КБ (у старого сайта было больше 10 МБ).

## Контент

**Секции:** Hero (фото зала) → Welcome (3 абзаца) → Barbers → Services → Book an appointment → Location (карта) → Контакты/соцсети → футер.

**Контакты**
- Адрес: Τρίτωνος 38, Παλαιό Φάληρο 17561 (Tritonos 38, Palaio Faliro, Athens)
- Телефон: 211 116 4942
- Email: aiolosbarbershop@gmail.com (в WP-версии был book@aiolosbarbershop.gr)
- Запись: https://booking.setmore.com/scheduleappointment/c42e5be8-f7db-4011-91a4-7714deb86468
- Facebook: https://www.facebook.com/aiolosbarbershop/
- Instagram: https://www.instagram.com/aiolosbarbershop/

**Барберы**
- Aiolos Ksenogiannakis — Head Barber and Founder, 12+ лет опыта, специализация — женские стрижки. IG: aiolos_ksenogiannakis
- John Karakostas — Apprentice Barber and Co-Founder. IG: j0nk4r2_666

**Услуги и цены** — как было на старом сайте, актуальная версия теперь в `content/services.yml` (раньше они были только картинкой `images/2023/09/25/aiolos-barbershop-services.png`, скриншот из Setmore):

| Категория | Услуга | Время | Цена |
|---|---|---|---|
| Haircuts | Women's Haircut | 60 мин | €20 |
| | Men's Haircut & Beard trim | 30 мин | €18 |
| | Men's Haircut | 30 мин | €15 |
| | Kid's Haircut | 30 мин | €12 |
| Beard Trim | Beard Trimming | 15 мин | €7 |
| Shaving | Straight Razor Shave | 45 мин | €12 |
| | Electric Razor Shave | 30 мин | €10 |
| Other | White Hair Covering | 30 мин | €10 |
| | Detox Therapy | 15 мин | €8 |

**Медиа** (`archive/www/images/`): логотип `aiolos-barbershop-logo.jpg` (16300×12343, 1.5 МБ — надо пережать), фото зала `2023/09/25/gopr4246d.jpg`, фото барберов `aiolos-barber.jpg`, `_dsc0001m_2.jpg` (6000×4000, 4 МБ), видео-фон `media/videos/2023/09/25/particles-27669.mp4` (7 МБ, стоковое). В WP-версии были ещё фото работ и логотип PNG — в `wp-content/uploads/`.

## Замечания к старому сайту

- В меню есть пункты *About* и *Works*, но таких секций на странице нет — мёртвые якоря.
- Прайс — картинка, а не текст (плохо для SEO и доступности).
- Картинки не оптимизированы (суммарно ~10 МБ на главной), `<title>` просто «Home», нет meta description, язык `en-gb` при греческой аудитории.
