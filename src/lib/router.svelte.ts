/**
 * Хэш-роутинг приложения (решение Р-19: GitHub Pages не умеет rewrite,
 * поэтому маршруты живут в хэше и статический сервер отдаёт один index.html).
 *
 * Файл назван *.svelte.ts намеренно: руны ($state) компилируются только в .svelte
 * и .svelte.ts — в обычном .ts вызов $state остался бы неизвестной функцией.
 */

/** Известные маршруты приложения. */
export type Route = '/calendar' | '/settings' | '/settings/theme';

const ROUTES: readonly Route[] = ['/calendar', '/settings', '/settings/theme'];

/** Маршрут по умолчанию: пустой и неизвестный хэш ведут сюда. */
const FALLBACK: Route = '/calendar';

/** Разбирает хэш адреса в маршрут; всё непонятное сводится к календарю. */
function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '');

  return ROUTES.find((route) => route === path) ?? FALLBACK;
}

/** Текущий маршрут; читается через router.current, меняется через хэш адреса. */
let current = $state<Route>(typeof location === 'undefined' ? FALLBACK : parseHash(location.hash));

export const router = {
  /** Действующий маршрут. */
  get current(): Route {
    return current;
  },

  /** Переход на маршрут: меняет хэш, остальное делает обработчик hashchange. */
  go(route: Route): void {
    if (location.hash !== `#${route}`) {
      location.hash = `#${route}`;
    }
  },

  /** Ссылка для разметки: href вкладок и кнопок перехода. */
  href(route: Route): string {
    return `#${route}`;
  },
};

/**
 * Включает слежение за хэшем. Возвращает функцию отключения — её отдаёт $effect в App.
 * Заодно приводит адрес в порядок: без хэша или с неизвестным хэшем в строке
 * оказывается #/calendar, чтобы обновление страницы возвращало на тот же экран.
 */
export function startRouter(): () => void {
  const sync = (): void => {
    current = parseHash(location.hash);
  };

  const normalized = parseHash(location.hash);

  if (location.hash !== `#${normalized}`) {
    history.replaceState(null, '', `${location.pathname}${location.search}#${normalized}`);
  }

  sync();
  window.addEventListener('hashchange', sync);

  return () => {
    window.removeEventListener('hashchange', sync);
  };
}
