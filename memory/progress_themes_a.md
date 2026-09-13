# Прогресс: темы v01–v10 (агент A)

Задача: извлечь дизайн-токены из макетов public/gallery/v01.html … v10.html в файлы src/lib/themes/v01.ts … v10.ts.
Старт: отчёт создан.

## Шаги
- [x] Каркас отчёта создан
- [ ] Прочитан docs/design_tokens.md
- [ ] Прочитан src/lib/themes/types.ts
- [ ] Изучены макеты v01–v10
- [ ] Созданы файлы тем
- [ ] Самопроверка

## Прочитано
- docs/design_tokens.md: 40 токенов, 6 групп (поверхности/текст, три ключевых цвета, кнопки, состояния календаря, форма и типографика, оболочка). Правила: все ключи обязательны, значения самодостаточные, контраст пар «цвет/текст на нём».
- src/lib/themes/types.ts: интерфейсы ThemeTokens (40 ключей) и Theme (id, name, layout, dark, tokens) + CSS_VARIABLES. Файл не менялся.

## Источник значений
Из макетов взяты блоки `<title>` и `<style>` (`:root` + классы .cell/.today/.weekdays/.tabbar/кнопки). JS макетов идентичен и на токены не влияет.

## Готовые темы (пакет 1)
- v01 Ясный день / панель сверху / светлая. bg #f5f6f8, surface #ffffff, primary #3b6ef0, weekend #c0483f. Выведено: colorSurfaceMuted #eceef2 (сдвиг светлоты от bg), colorTaskB/#c0483f из weekend, colorTaskC #8aa6f6 (осветлённый акцент), colorDone #9aa2b1 (muted), colorTertiary из weekend.
- v02 Тёплый песок / заголовок слева / светлая. bg #f7f1e6, surface #fffdf8, primary #b4713a, weekend #a8572f, шрифт Georgia serif. Выведено: colorTaskC #8c7a55 (третья тёплая метка), colorDone #a3927c (muted), onSecondary #3a3027 вместо акцента макета (контраст на #f2e1cd низкий).
- v03 Северный лёд / заголовок-герой / светлая. bg #eef2f7, hero/secondary #31465e, primary #4a7fb5. Выведено: colorTaskC #8fb4d6 (осветлённый акцент), colorDone #7e8ea1 (muted), onTertiary #25313f (текст на светлом #dde8f4).
- v04 Мятный сад / сегментированный переключатель / светлая. bg #f2f8f3, primary #2e8b57, метки из макета: #2e8b57 / #8fbf6e (chip.alt) / #d8a33c (chip.warn). Выведено: colorDone #7d9a86 (muted), onSecondary #1e3326 (контраст на #dcefe3).
- v05 Полночь / нижняя панель навигации / ТЁМНАЯ. bg #12141a, surface #1b1e26, primary #6f8cff, secondary #39d3a0, weekend/tertiary #ff7b72. navBg rgba(27,30,38,.96) взят из .tabbar макета. Выведено: colorDone #79808f (muted).

## Готовые темы (пакет 2)
- v06 Коралловый риф / месяц-таблетка / светлая. bg #fff6f3 (плоский — градиент только в шапке, поэтому colorBg НЕ градиент), primary #ff6f5e, tertiary #ff8a72 (конец градиента шапки). Выведено: colorTaskC #d6503f (цвет тени .pill из макета), colorDone #b9887f (muted), shadowCard из тени .pill.
- v07 Графит / двухстрочная шапка / светлая. bg/surface #ffffff, surfaceMuted #f4f4f5 (--panel), primary #3f4045, метки из .tick #5c5d63 и .tick.soft #bfc0c5. Выведено: colorTaskA #3f4045 (акцент), colorDone #a5a7ad (weekend/приглушённый), shadowCard none (макет на линиях).
- v08 Тихий минимализм / тонкие линии / светлая. bg #fbfbfa, ink #161616, hair #e8e8e5. Скругления 0. Выведено много: colorSurface = bg (карточек в макете нет), colorSurfaceMuted #f1f1ee, colorTaskB #5a5a58 и colorDone #c9c9c5 (градации монохрома), colorWeekend #9b9b98 (в макете выходные не выделены), buttonRadius 0px (кнопок-плашек нет, только текстовые).
- v09 Пастельные карточки / шапка с тенью / светлая. bg #f4f2fb, primary #8f7ee0, палитра меток целиком из макета: #8f7ee0 / #f4a6c0 (pink) / #f6c96b (sun), colorDone #8fd8c4 (mint). shadowCard из .head-card. Выведено: onSecondary/onTertiary #3b3550 ради контраста на пастели.
- v10 Фиолетовый блок / акцентная шапка / светлая. bg #ffffff, brand #5b21b6 (secondary), accent #7c3aed (primary), weekend/tertiary #b09bd8. Выведено: colorTaskC #b09bd8, colorDone #8f85a8 (muted), buttonSecondaryText #5b21b6 вместо #7c3aed (контраст на #f1ebfe).

## Общие решения по выводу значений
- colorSurfaceMuted: где в макете нет отдельной приглушённой поверхности — сдвиг светлоты от colorBg (v01, v08); где есть accent-soft/panel/cell-bg — берётся он (v02, v03, v04, v06, v07, v09, v10) или surface-2 (v05).
- colorSecondary: второй настоящий цвет макета, если он есть (v03 hero, v05 accent-2, v09 pink, v10 brand), иначе мягкая заливка акцента (accent-soft).
- Контраст важнее буквы макета: в v02, v04, v09, v10 текст на мягкой заливке затемнён относительно макета (там был сам акцент, отношение около 3.4:1).
- colorDone: приглушённый цвет палитры, либо зелёный/мятный, если он есть в макете (v04, v05, v09).
- buttonRadius: скругление главной кнопки действия («Сегодня») конкретного макета.
- fontFamilyHeading = fontFamily во всех десяти: отдельного шрифта заголовка месяца в макетах v01–v10 нет.

## Самопроверка
1. Все 10 файлов созданы: src/lib/themes/v01.ts … v10.ts (в каталоге также чужие v11–v15, v21–v26, apply.ts, index.ts — не трогались).
2. Набор ключей сверен с ThemeTokens через comm: в каждом файле ровно 40 ключей, расхождений нет.
3. grep -c ":" — по 46 в каждом из десяти файлов (одинаково).
4. var(-- не найдено, пустых значений ('') не найдено.
5. index.ts собирает темы через import.meta.glob('./v*.ts') и берёт module.default — формат файлов (`export default theme`) совпадает.
6. types.ts, docs/, макеты, App.svelte, конфиги не изменялись. Коммитов и сборки не было.

Готово.
