<script lang="ts">
  /**
   * Экран «Календарь» — главный экран приложения (требование Т-11).
   * Раскладка временная: итоговую владелец выбирает из галереи макетов,
   * здесь нужен рабочий месяц с переходом по месяцам и метками задач.
   */

  const MONTHS = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  const MONTHS_SHORT = [
    'Янв',
    'Фев',
    'Мар',
    'Апр',
    'Май',
    'Июн',
    'Июл',
    'Авг',
    'Сен',
    'Окт',
    'Ноя',
    'Дек',
  ];

  /** Неделя начинается с понедельника. */
  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  /** Сетка месяца — шесть недель: высота экрана не скачет при переходе между месяцами. */
  const CELLS_IN_GRID = 42;

  /** Категория демонстрационной метки задачи: токены --color-task-a/b/c. */
  type TaskCategory = 'a' | 'b' | 'c';

  interface DayCell {
    key: string;
    day: number;
    /** День принадлежит показываемому месяцу, а не соседнему. */
    inMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    marks: TaskCategory[];
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  let viewYear = $state(todayYear);
  let viewMonth = $state(todayMonth);

  let pickerOpen = $state(false);
  let pickerYear = $state(todayYear);

  /**
   * Демонстрационные метки задач: детерминированная выдумка от даты.
   * Настоящих задач в оболочке ещё нет, а перерисовка не должна менять картинку.
   */
  function demoMarks(year: number, month: number, day: number): TaskCategory[] {
    const seed = (year * 12 + month) * 31 + day;
    const marks: TaskCategory[] = [];

    if (seed % 3 === 0) {
      marks.push('a');
    }

    if (seed % 5 === 0) {
      marks.push('b');
    }

    if (seed % 7 === 0) {
      marks.push('c');
    }

    return marks;
  }

  /** Строит 42 ячейки месяца вместе с хвостами соседних месяцев. */
  function buildCells(year: number, month: number): DayCell[] {
    const firstWeekday = new Date(year, month, 1).getDay();
    // getDay(): воскресенье — 0; сдвигаем к понедельнику.
    const shift = (firstWeekday + 6) % 7;
    const cells: DayCell[] = [];

    for (let index = 0; index < CELLS_IN_GRID; index += 1) {
      const date = new Date(year, month, index + 1 - shift);
      const cellYear = date.getFullYear();
      const cellMonth = date.getMonth();
      const cellDay = date.getDate();
      const inMonth = cellMonth === month && cellYear === year;
      const weekday = date.getDay();

      cells.push({
        key: `${cellYear}-${cellMonth}-${cellDay}`,
        day: cellDay,
        inMonth,
        isToday: cellYear === todayYear && cellMonth === todayMonth && cellDay === todayDay,
        isWeekend: weekday === 0 || weekday === 6,
        marks: inMonth ? demoMarks(cellYear, cellMonth, cellDay) : [],
      });
    }

    return cells;
  }

  const cells = $derived(buildCells(viewYear, viewMonth));
  const heading = $derived(`${MONTHS[viewMonth]} ${viewYear}`);

  function openPicker(): void {
    pickerYear = viewYear;
    pickerOpen = true;
  }

  function closePicker(): void {
    pickerOpen = false;
  }

  function pickMonth(month: number): void {
    viewYear = pickerYear;
    viewMonth = month;
    pickerOpen = false;
  }

  function shiftYear(delta: number): void {
    pickerYear += delta;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (pickerOpen && event.key === 'Escape') {
      closePicker();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="screen">
  <header class="header">
    <!-- Значка-стрелки у заголовка нет намеренно: по указанию владельца кликабельность
         надписи очевидна и без него. -->
    <button type="button" class="heading" onclick={openPicker} aria-haspopup="dialog">
      <span class="heading-text">{heading}</span>
    </button>
  </header>

  <div class="grid" role="grid" aria-label="Календарь на месяц">
    <div class="weekdays" role="row">
      {#each WEEKDAYS as weekday, index (weekday)}
        <span class="weekday" class:weekday--rest={index > 4} role="columnheader">{weekday}</span>
      {/each}
    </div>

    <div class="days" role="rowgroup">
      {#each cells as cell (cell.key)}
        <div
          class="day"
          class:day--outside={!cell.inMonth}
          class:day--today={cell.isToday}
          class:day--weekend={cell.isWeekend && cell.inMonth}
          role="gridcell"
        >
          <span class="day-number">{cell.day}</span>
          <span class="marks">
            {#each cell.marks as mark (mark)}
              <span class="mark mark--{mark}"></span>
            {/each}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <p class="legend">
    <span class="legend-item"><span class="mark mark--a"></span>Работа</span>
    <span class="legend-item"><span class="mark mark--b"></span>Дом</span>
    <span class="legend-item"><span class="mark mark--c"></span>Личное</span>
  </p>
</section>

{#if pickerOpen}
  <div class="overlay">
    <button type="button" class="backdrop" aria-label="Закрыть выбор месяца" onclick={closePicker}
    ></button>

    <div class="modal" role="dialog" aria-modal="true" aria-label="Переход к месяцу">
      <div class="year">
        <button
          type="button"
          class="year-step"
          onclick={() => shiftYear(-1)}
          aria-label="Предыдущий год"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M14 6l-6 6 6 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span class="year-value">{pickerYear}</span>
        <button
          type="button"
          class="year-step"
          onclick={() => shiftYear(1)}
          aria-label="Следующий год"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M10 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="months">
        {#each MONTHS_SHORT as month, index (month)}
          <button
            type="button"
            class="month"
            class:month--current={index === todayMonth && pickerYear === todayYear}
            class:month--selected={index === viewMonth && pickerYear === viewYear}
            onclick={() => pickMonth(index)}
          >
            {month}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .header {
    display: flex;
    justify-content: center;
  }

  .heading {
    display: inline-flex;
    gap: var(--space-xs);
    align-items: center;
    padding: var(--space-xs) var(--space-md);
    border: 1px solid transparent;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-text);
    font-family: var(--font-family-heading);
    font-size: 1.4rem;
    font-weight: var(--font-weight-heading);
    letter-spacing: var(--letter-spacing-heading);
    line-height: 1.2;
    cursor: pointer;
  }

  .heading:hover,
  .heading:focus-visible {
    border-color: var(--color-border);
  }

  .grid {
    padding: var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
  }

  .weekdays,
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .weekday {
    padding: var(--space-xs) 0;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .weekday--rest {
    color: var(--color-weekend);
  }

  .day {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1 / 1;
    min-width: 0;
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .day--outside {
    color: var(--color-text-muted);
    opacity: 0.55;
  }

  .day--weekend {
    color: var(--color-weekend);
  }

  .day--today {
    background: var(--color-today);
    color: var(--color-on-today);
    font-weight: 600;
  }

  .day-number {
    line-height: 1;
  }

  .marks {
    display: flex;
    gap: 3px;
    min-height: 5px;
    align-items: center;
  }

  .mark {
    width: 5px;
    height: 5px;
    border-radius: var(--radius-pill);
    flex: none;
  }

  .mark--a {
    background: var(--color-task-a);
  }

  .mark--b {
    background: var(--color-task-b);
  }

  .mark--c {
    background: var(--color-task-c);
  }

  .legend {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
    justify-content: center;
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .legend-item {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: var(--space-md);
  }

  .backdrop {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, var(--color-text) 45%, transparent);
    cursor: pointer;
  }

  .modal {
    position: relative;
    width: min(100%, 340px);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
  }

  .year {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
    justify-content: space-between;
  }

  .year-step {
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }

  .year-step svg {
    width: 20px;
    height: 20px;
  }

  .year-value {
    font-family: var(--font-family-heading);
    font-size: 1.15rem;
    font-weight: var(--font-weight-heading);
  }

  .months {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm);
  }

  .month {
    padding: var(--space-sm) var(--space-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-muted);
    color: var(--color-text);
    font-family: var(--font-family);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .month--current {
    border-color: var(--color-today);
    color: var(--color-text);
    font-weight: 600;
  }

  .month--selected {
    border-color: transparent;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-weight: 600;
  }
</style>
