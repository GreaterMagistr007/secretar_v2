<script lang="ts">
  /**
   * Экран «Календарь» — главный экран приложения (требование Т-11).
   * Сетка месяца с переходом по месяцам, метки задач по приоритетам (требование Т-24),
   * выбор дня со списком его задач (требование Т-27) и кнопка добавления задачи
   * (требование Т-25), открывающая модалку создания (требование Т-26).
   */
  import type { NewTask, Priority, Task } from '../lib/tasks/types';
  import { taskRepository } from '../lib/task-repository';
  import { calendarState } from '../lib/calendar-state.svelte';
  import { PRIORITY_COLOR, PRIORITY_ORDER } from '../lib/priority';
  import { formatLongDate, toIsoDate, todayIso } from '../lib/date';
  import TaskCreateModal from '../lib/components/TaskCreateModal.svelte';
  import DayTaskList from '../lib/components/DayTaskList.svelte';

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
  const WEEKS_IN_GRID = 6;
  const DAYS_IN_WEEK = 7;

  interface DayCell {
    /** Дата ячейки в виде YYYY-MM-DD — она же ключ списка. */
    iso: string;
    day: number;
    /** День принадлежит показываемому месяцу, а не соседнему. */
    inMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayIsoDate = todayIso();

  let pickerOpen = $state(false);
  let pickerYear = $state(todayYear);

  /** Задачи всех дней, попавших в сетку: из них собираются метки. */
  let monthTasks = $state<Task[]>([]);
  let monthError = $state<string | null>(null);

  /** Задачи выбранного дня. */
  let dayTasks = $state<Task[]>([]);
  let dayLoading = $state(false);
  let dayError = $state<string | null>(null);

  let modalOpen = $state(false);

  /** Счётчик перечитывания: растёт после сохранения задачи и обновляет метки и список. */
  let reloadToken = $state(0);

  /** Строит шесть недель по семь дней вместе с хвостами соседних месяцев. */
  function buildWeeks(year: number, month: number): DayCell[][] {
    const firstWeekday = new Date(year, month, 1).getDay();
    // getDay(): воскресенье — 0; сдвигаем к понедельнику.
    const shift = (firstWeekday + 6) % 7;
    const weeks: DayCell[][] = [];

    for (let week = 0; week < WEEKS_IN_GRID; week += 1) {
      const cells: DayCell[] = [];

      for (let index = 0; index < DAYS_IN_WEEK; index += 1) {
        const date = new Date(year, month, week * DAYS_IN_WEEK + index + 1 - shift);
        const weekday = date.getDay();

        cells.push({
          iso: toIsoDate(date),
          day: date.getDate(),
          inMonth: date.getMonth() === month && date.getFullYear() === year,
          isToday: toIsoDate(date) === todayIsoDate,
          isWeekend: weekday === 0 || weekday === 6,
        });
      }

      weeks.push(cells);
    }

    return weeks;
  }

  /** Метки дня: по одной на каждый встретившийся приоритет, важное первым. */
  function buildMarks(tasks: Task[]): Map<string, Priority[]> {
    const found = new Map<string, Set<Priority>>();

    for (const task of tasks) {
      const priorities = found.get(task.date) ?? new Set<Priority>();

      priorities.add(task.priority);
      found.set(task.date, priorities);
    }

    const marks = new Map<string, Priority[]>();

    for (const [date, priorities] of found) {
      marks.set(
        date,
        PRIORITY_ORDER.filter((priority) => priorities.has(priority)),
      );
    }

    return marks;
  }

  /** Сколько задач в каждом дне: нужно только для подписи ячейки в озвучке. */
  function buildCounts(tasks: Task[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const task of tasks) {
      counts.set(task.date, (counts.get(task.date) ?? 0) + 1);
    }

    return counts;
  }

  const weeks = $derived(buildWeeks(calendarState.viewYear, calendarState.viewMonth));
  const marks = $derived(buildMarks(monthTasks));
  const counts = $derived(buildCounts(monthTasks));
  const heading = $derived(`${MONTHS[calendarState.viewMonth]} ${calendarState.viewYear}`);

  // Метки сетки: задачи всего показанного диапазона, включая хвосты соседних месяцев.
  $effect(() => {
    const from = weeks[0][0].iso;
    const to = weeks[WEEKS_IN_GRID - 1][DAYS_IN_WEEK - 1].iso;

    // Перечитывание после сохранения задачи: месяц тот же, а данные уже другие.
    void reloadToken;

    let cancelled = false;

    taskRepository
      .listByRange(from, to)
      .then((tasks) => {
        if (cancelled) {
          return;
        }

        monthTasks = tasks;
        monthError = null;
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        monthTasks = [];
        monthError = 'Не удалось прочитать задачи месяца.';
      });

    return () => {
      cancelled = true;
    };
  });

  // Список задач выбранного дня.
  $effect(() => {
    const date = calendarState.selectedDate;

    void reloadToken;

    if (date === null) {
      dayTasks = [];
      dayLoading = false;
      dayError = null;

      return;
    }

    let cancelled = false;

    dayLoading = true;
    dayError = null;

    taskRepository
      .listByDate(date)
      .then((tasks) => {
        if (cancelled) {
          return;
        }

        dayTasks = tasks;
        dayLoading = false;
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        dayTasks = [];
        dayError = 'Не удалось прочитать задачи дня.';
        dayLoading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  /** Подпись ячейки для озвучки: дата и сколько на ней задач. */
  function dayLabel(cell: DayCell): string {
    const count = counts.get(cell.iso) ?? 0;

    return count === 0
      ? `${formatLongDate(cell.iso)}, задач нет`
      : `${formatLongDate(cell.iso)}, задач: ${count}`;
  }

  function selectDay(cell: DayCell): void {
    calendarState.select(cell.iso);
  }

  function openPicker(): void {
    pickerYear = calendarState.viewYear;
    pickerOpen = true;
  }

  function closePicker(): void {
    pickerOpen = false;
  }

  function pickMonth(month: number): void {
    calendarState.showMonth(pickerYear, month);
    pickerOpen = false;
  }

  function shiftYear(delta: number): void {
    pickerYear += delta;
  }

  function openModal(): void {
    modalOpen = true;
  }

  function closeModal(): void {
    modalOpen = false;
  }

  /**
   * Сохранение задачи из модалки. Ошибку намеренно не глушим: модалка остаётся открытой
   * и показывает сообщение, введённое не пропадает.
   */
  async function createTask(data: NewTask): Promise<void> {
    const created = await taskRepository.create(data);

    calendarState.select(created.date);
    reloadToken += 1;
    modalOpen = false;
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
      {#each weeks as week (week[0].iso)}
        <div class="week" role="row">
          {#each week as cell (cell.iso)}
            <span
              class="cell"
              role="gridcell"
              aria-selected={cell.iso === calendarState.selectedDate}
            >
              <button
                type="button"
                class="day"
                class:day--outside={!cell.inMonth}
                class:day--weekend={cell.isWeekend && cell.inMonth}
                class:day--selected={cell.iso === calendarState.selectedDate}
                class:day--today={cell.isToday}
                aria-label={dayLabel(cell)}
                aria-current={cell.isToday ? 'date' : undefined}
                onclick={() => selectDay(cell)}
              >
                <span class="day-number">{cell.day}</span>
                <span class="marks">
                  {#each marks.get(cell.iso) ?? [] as priority (priority)}
                    <span class="mark" style="background: {PRIORITY_COLOR[priority]}"></span>
                  {/each}
                </span>
              </button>
            </span>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  {#if monthError !== null}
    <p class="grid-error" role="alert">{monthError}</p>
  {/if}

  <!-- Метки в ячейках показывают приоритет задачи (требование Т-24). Цвета те же, что были
       у прежних категорий: расцветка сохранена, изменился только смысл подписей. -->
  <p class="legend">
    <span class="legend-item"
      ><span class="mark" style="background: {PRIORITY_COLOR.medium}"></span>Средний</span
    >
    <span class="legend-item"
      ><span class="mark" style="background: {PRIORITY_COLOR.low}"></span>Низкий</span
    >
    <span class="legend-item"
      ><span class="mark" style="background: {PRIORITY_COLOR.high}"></span>Высокий</span
    >
  </p>

  {#if calendarState.selectedDate !== null}
    <DayTaskList
      date={calendarState.selectedDate}
      tasks={dayTasks}
      loading={dayLoading}
      error={dayError}
    />
  {/if}
</section>

<button type="button" class="add" onclick={openModal} aria-label="Добавить задачу">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 5v14M5 12h14"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
    />
  </svg>
</button>

{#if modalOpen}
  <TaskCreateModal
    initialDate={calendarState.selectedDate ?? todayIsoDate}
    onSubmit={createTask}
    onClose={closeModal}
  />
{/if}

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
            class:month--selected={index === calendarState.viewMonth &&
              pickerYear === calendarState.viewYear}
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
    /* Запас снизу: кнопка добавления не должна перекрывать последнюю задачу списка. */
    padding-bottom: calc(var(--space-lg) + 64px);
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
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .days {
    display: flex;
    flex-direction: column;
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

  .cell {
    display: block;
    min-width: 0;
  }

  .day {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 3px;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1 / 1;
    min-width: 0;
    padding: 0;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text);
    font-family: var(--font-family);
    font-size: 0.95rem;
    cursor: pointer;
  }

  .day--outside {
    color: var(--color-text-muted);
    opacity: 0.55;
  }

  .day--weekend {
    color: var(--color-weekend);
  }

  .day--selected {
    background: var(--color-selected);
    color: var(--color-text);
    font-weight: 600;
    opacity: 1;
  }

  .day--today {
    background: var(--color-today);
    color: var(--color-on-today);
    font-weight: 600;
  }

  /* Сегодняшний день, выбранный кликом: фон остаётся «сегодняшним», выбор показан обводкой. */
  .day--today.day--selected {
    outline: 2px solid var(--color-selected);
    outline-offset: -2px;
  }

  .day:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
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

  .grid-error {
    margin: 0;
    color: var(--color-weekend);
    font-size: 0.85rem;
    text-align: center;
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

  /* Кнопка добавления задачи (требование Т-25): правый нижний угол над навигацией,
     с учётом безопасных отступов устройства. */
  .add {
    position: fixed;
    right: calc(var(--space-md) + env(safe-area-inset-right));
    bottom: calc(var(--space-md) + var(--nav-height) + env(safe-area-inset-bottom));
    z-index: 30;
    display: inline-flex;
    width: 56px;
    height: 56px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--button-primary-border);
    border-radius: var(--radius-pill);
    background: var(--button-primary-bg);
    box-shadow: var(--shadow-card);
    color: var(--button-primary-text);
    cursor: pointer;
  }

  .add svg {
    width: 26px;
    height: 26px;
  }

  .add:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
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
