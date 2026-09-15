/**
 * Хэш-роутинг приложения (решение Р-19: GitHub Pages не умеет rewrite,
 * поэтому маршруты живут в хэше и статический сервер отдаёт один index.html).
 *
 * Файл назван *.svelte.ts намеренно: руны ($state) компилируются только в .svelte
 * и .svelte.ts — в обычном .ts вызов $state остался бы неизвестной функцией.
 */

/** Маршруты без параметров. */
export type StaticRoute = '/calendar' | '/settings' | '/settings/theme';

/** Известные маршруты приложения; у '/task' есть параметр — идентификатор задачи. */
export type Route = StaticRoute | '/task';

const STATIC_ROUTES: readonly StaticRoute[] = ['/calendar', '/settings', '/settings/theme'];

/** Начало пути экрана задачи (требование Т-28): #/task/<id>. */
const TASK_PREFIX = '/task/';

/** Маршрут по умолчанию: пустой и неизвестный хэш ведут сюда. */
const FALLBACK: StaticRoute = '/calendar';

/** Разобранный адрес: маршрут, его параметр и канонический путь для нормализации хэша. */
interface Match {
  route: Route;
  taskId: string | null;
  path: string;
}

/** Разбирает хэш адреса в маршрут; всё непонятное сводится к календарю. */
function parseHash(hash: string): Match {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '');

  if (path.startsWith(TASK_PREFIX)) {
    const id = decodeURIComponent(path.slice(TASK_PREFIX.length));

    if (id !== '') {
      return { route: '/task', taskId: id, path };
    }
  }

  const known = STATIC_ROUTES.find((route) => route === path) ?? FALLBACK;

  return { route: known, taskId: null, path: known };
}

/** Текущий маршрут; читается через router.current, меняется через хэш адреса. */
let match = $state<Match>(
  typeof location === 'undefined'
    ? { route: FALLBACK, taskId: null, path: FALLBACK }
    : parseHash(location.hash),
);

export const router = {
  /** Действующий маршрут. */
  get current(): Route {
    return match.route;
  },

  /** Идентификатор задачи на маршруте '/task'; на остальных маршрутах null. */
  get taskId(): string | null {
    return match.taskId;
  },

  /** Переход на маршрут: меняет хэш, остальное делает обработчик hashchange. */
  go(route: StaticRoute): void {
    if (location.hash !== `#${route}`) {
      location.hash = `#${route}`;
    }
  },

  /** Ссылка для разметки: href вкладок и кнопок перехода. */
  href(route: StaticRoute): string {
    return `#${route}`;
  },

  /** Ссылка на экран задачи: список дня открывает задачу обычной ссылкой. */
  hrefTask(id: string): string {
    return `#${TASK_PREFIX}${encodeURIComponent(id)}`;
  },
};

/**
 * Включает слежение за хэшем. Возвращает функцию отключения — её отдаёт $effect в App.
 * Заодно приводит адрес в порядок: без хэша или с неизвестным хэшем в строке
 * оказывается #/calendar, чтобы обновление страницы возвращало на тот же экран.
 */
export function startRouter(): () => void {
  const sync = (): void => {
    match = parseHash(location.hash);
  };

  const normalized = parseHash(location.hash);

  if (location.hash !== `#${normalized.path}`) {
    history.replaceState(null, '', `${location.pathname}${location.search}#${normalized.path}`);
  }

  sync();
  window.addEventListener('hashchange', sync);

  return () => {
    window.removeEventListener('hashchange', sync);
  };
}
