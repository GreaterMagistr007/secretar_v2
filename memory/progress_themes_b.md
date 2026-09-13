# Темы v11–v20 (агент B)
Старт: извлечение токенов из public/gallery/v11.html … v20.html в src/lib/themes/v11.ts … v20.ts.
Правила: docs/design_tokens.md, контракт src/lib/themes/types.ts (не менять).

## Ход работы
- Прочитаны docs/design_tokens.md и src/lib/themes/types.ts (39 ключей ThemeTokens).
- v11 «Хвоя» — готово. Ядро: bg #f1f6f2, primary #14432c (fir), secondary #2f7d53, tertiary #c2703d. Выведены: colorSurfaceMuted #e6eee8, colorTaskC #c2a23d (третьей метки в макете нет), colorDone #b9c9be, shadowCard из тени панели списка с нормализованным направлением.
- v12 «Бирюза» — готово. bg #f3fbfb, primary #0d8b86, secondary #075c59, tertiary #e0755a (warn). Выведены: colorTaskC #e0b45a, colorDone #b7d3d1, colorSurfaceMuted #eef7f6 (фон кнопки «Отмена» из макета).
- v13 «Янтарь» — готово. bg #fffaf0, primary #e0930c, secondary #a86505, done #5f8f4e (зелёная точка из макета). Выведены: colorWeekend #bf5b2a, colorTaskB #c2562f. Контраст: белый текст на #e0930c даёт 2.5:1, поэтому colorOnPrimary/colorOnToday = #3a2a10 (5.2:1) вопреки макету.
- v14 «Светлый графит» — готово. Монохром: bg #f7f7f8, primary #2b2d31, ladder меток #2b2d31/#8d9096/#c3c6cb. shadowCard none (макет плоский). Выведены: colorSurfaceMuted #f0f0f2, colorSelected #eceef0, colorWeekend = muted (в макете выходные не выделены).
- v15 «Океан» — готово. bg #eef6f7, primary #0f7a86, secondary #063a45 (deep), метки — шкала загруженности l4/l3/l2, done = l1 #bfe0de. shadowCard none. Выведены: colorWeekend #39a3a6, colorSelected #bfe0de (в макете подчёркивание currentColor).
- v16 «Сакура» — готово. bg #fff6f8, primary #e2688f, secondary #b8375f, tertiary #8a5a7a (plum). Контраст: белый на #e2688f = 3.2:1, поэтому colorOnPrimary/colorOnToday = #3d1f2b (5.5:1). Выведены: colorSurfaceMuted #fdeaef, colorTaskC #b8375f.
- v17 «Брутализм» — готово. bg #f4f2e9, primary #ffe000 на чёрном #0a0a0a, красный #e03c00 третичный. Все радиусы 0, shadowCard '6px 6px 0 #0a0a0a', моноширинный стек шрифтов, colorBorder = #0a0a0a (толстые чёрные рамки). Выведено: navBg #0a0a0a с жёлтой активной вкладкой (по полоскам-шапкам макета).
- v18 «Стекло» — готово, dark: true. colorBg — градиент из макета linear-gradient(160deg,#3b2a8c,#5b31a8 42%,#2a2a78), поверхности rgba(255,255,255,.13/.08), accent #8ef0d8 и #ffb3e6. Выведены: colorTertiary/colorTaskC #9ecdff (третьего акцента в макете нет), colorWeekend #ffb3e6, colorOnSecondary #3d1030.
- v19 «Терракота» — готово. bg #fbf4ee, primary #c0562f (terra), secondary #8c3a1c, tertiary #7e8a4b (olive). Выведены: colorSurfaceMuted #f4eae1, colorTaskC #c9922f (в макете только terra и olive), colorWeekend = terra (выходные в макете не выделены).
- v20 «Неон» — готово, dark: true. bg #0a0c14, панели #12151f/#161a26, свечения #37f5c5 / #b46cff / #ff4f9a — прямо метки задач A/B/C. Кнопка основная сделана «призрачной» как в макете: фон rgba(55,245,197,.12), текст и рамка неоново-мятные. Выведены: shadowCard из свечения диалога, colorWeekend #ff4f9a, colorDone #39405a (цвет чисел соседних месяцев).

## Самопроверка
1. Все 10 файлов созданы: src/lib/themes/v11.ts … v20.ts.
2. Скрипт сверки с ThemeTokens: в интерфейсе 40 ключей, в каждой из 10 тем ровно 40, пропущенных и лишних ключей нет.
3. grep -c ":" — по 46 строк с двоеточием в каждой теме (v20 — 47: двоеточие внутри doc-комментария). Значения сопоставимы между темами.
4. Значений с var(-- нет, пустых значений нет; градиент использован только в colorBg у v18 «Стекло».
5. Общее правило по парам «цвет/текст на нём»: выбран вариант с большим коэффициентом контраста. Из-за этого в v13 и v16 тёмный текст на янтаре и розовом вместо белого, как в макете (белый давал 2.5:1 и 3.2:1).
