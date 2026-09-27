import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryTaskRepository } from './memory-repository';

describe('MemoryTaskRepository', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create и get', () => {
    it('создаёт задачу с идентификатором, токенами и метками времени', async () => {
      const repository = new MemoryTaskRepository();

      const task = await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'high',
        recurrence: 'none',
      });

      expect(task.id).toHaveLength(36);
      expect(task.text).toBe('Купить молоко');
      expect(task.date).toBe('2026-09-15');
      expect(task.priority).toBe('high');
      expect(task.recurrence).toBe('none');
      expect(task.searchTokens).toEqual(['купить', 'молоко']);
      expect(task.createdAt).toBe(task.updatedAt);
    });

    it('отдаёт созданную задачу по идентификатору', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Позвонить в банк',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.get(created.id)).toEqual(created);
    });

    it('на неизвестный идентификатор отдаёт null', async () => {
      const repository = new MemoryTaskRepository();

      expect(await repository.get('нет такой задачи')).toBeNull();
    });

    it('выдаёт копию: правка полученного объекта не меняет хранилище', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Купить хлеб',
        date: '2026-09-15',
        priority: 'low',
        recurrence: 'none',
      });

      created.text = 'Подменённый текст';

      const stored = await repository.get(created.id);

      expect(stored?.text).toBe('Купить хлеб');
    });

    it('сохраняет переданное повторение, а не значение по умолчанию', async () => {
      const repository = new MemoryTaskRepository();

      const created = await repository.create({
        text: 'Полить цветы',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'weekly',
      });

      expect(created.recurrence).toBe('weekly');
      expect((await repository.get(created.id))?.recurrence).toBe('weekly');
    });
  });

  describe('listOccurrencesByDate', () => {
    it('на пустой день отдаёт пустой список', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.listOccurrencesByDate('2026-09-16')).toEqual([]);
    });

    it('отдаёт задачи только запрошенного дня', async () => {
      const repository = new MemoryTaskRepository();
      const today = await repository.create({
        text: 'Сегодня',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.create({
        text: 'Завтра',
        date: '2026-09-16',
        priority: 'medium',
        recurrence: 'none',
      });

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list.map((item) => item.task.id)).toEqual([today.id]);
    });

    it('сортирует день по приоритету, затем по времени создания', async () => {
      const repository = new MemoryTaskRepository();
      const lowFirst = await repository.create({
        text: 'Низкий один',
        date: '2026-09-15',
        priority: 'low',
        recurrence: 'none',
      });
      const mediumEarly = await repository.create({
        text: 'Средний ранний',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      const high = await repository.create({
        text: 'Высокий',
        date: '2026-09-15',
        priority: 'high',
        recurrence: 'none',
      });
      const mediumLate = await repository.create({
        text: 'Средний поздний',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list.map((item) => item.task.id)).toEqual([
        high.id,
        mediumEarly.id,
        mediumLate.id,
        lowFirst.id,
      ]);
    });

    it('еженедельная задача попадает в день вхождения, а не только в день старта', async () => {
      const repository = new MemoryTaskRepository();
      const weekly = await repository.create({
        text: 'Еженедельная',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'weekly',
      });

      const list = await repository.listOccurrencesByDate('2026-09-22');

      expect(list.map((item) => item.task.id)).toEqual([weekly.id]);
      expect(list[0]?.date).toBe('2026-09-22');
      expect(list[0]?.done).toBe(false);
      expect(await repository.listOccurrencesByDate('2026-09-23')).toEqual([]);
    });

    it('нерегулярная задача видна только в своём дне', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Однократная',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.listOccurrencesByDate('2026-09-15')).toHaveLength(1);
      expect(await repository.listOccurrencesByDate('2026-09-14')).toEqual([]);
      expect(await repository.listOccurrencesByDate('2026-09-16')).toEqual([]);
      expect(await repository.listOccurrencesByDate('2026-10-15')).toEqual([]);
    });

    it('в одном дне видны и нерегулярная задача, и вхождение регулярной', async () => {
      const repository = new MemoryTaskRepository();
      const weekly = await repository.create({
        text: 'Еженедельная',
        date: '2026-09-15',
        priority: 'high',
        recurrence: 'weekly',
      });
      const plain = await repository.create({
        text: 'Однократная',
        date: '2026-09-22',
        priority: 'low',
        recurrence: 'none',
      });

      const list = await repository.listOccurrencesByDate('2026-09-22');

      expect(list.map((item) => item.task.id)).toEqual([weekly.id, plain.id]);
    });
  });

  describe('listOccurrencesByRange', () => {
    it('включает обе границы диапазона', async () => {
      const repository = new MemoryTaskRepository();
      const from = await repository.create({
        text: 'Первая',
        date: '2026-09-01',
        priority: 'medium',
        recurrence: 'none',
      });
      const inside = await repository.create({
        text: 'Средняя',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      const to = await repository.create({
        text: 'Последняя',
        date: '2026-09-30',
        priority: 'medium',
        recurrence: 'none',
      });

      const list = await repository.listOccurrencesByRange('2026-09-01', '2026-09-30');

      expect(list.map((item) => item.task.id)).toEqual([from.id, inside.id, to.id]);
    });

    it('не берёт задачи за границами диапазона', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Раньше',
        date: '2026-08-31',
        priority: 'medium',
        recurrence: 'none',
      });
      const inside = await repository.create({
        text: 'Внутри',
        date: '2026-09-01',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.create({
        text: 'Позже',
        date: '2026-10-01',
        priority: 'medium',
        recurrence: 'none',
      });

      const list = await repository.listOccurrencesByRange('2026-09-01', '2026-09-30');

      expect(list.map((item) => item.task.id)).toEqual([inside.id]);
    });

    it('диапазон из одного дня работает как список дня', async () => {
      const repository = new MemoryTaskRepository();
      const only = await repository.create({
        text: 'Один день',
        date: '2026-09-15',
        priority: 'low',
        recurrence: 'none',
      });

      const list = await repository.listOccurrencesByRange('2026-09-15', '2026-09-15');

      expect(list.map((item) => item.task.id)).toEqual([only.id]);
    });

    it('перевёрнутый диапазон даёт пустой список', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.listOccurrencesByRange('2026-09-30', '2026-09-01')).toEqual([]);
    });

    it('разворачивает еженедельную задачу во все дни вхождения диапазона', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Еженедельная',
        date: '2026-09-01',
        priority: 'medium',
        recurrence: 'weekly',
      });

      const list = await repository.listOccurrencesByRange('2026-09-01', '2026-09-30');

      expect(list.map((item) => item.date)).toEqual([
        '2026-09-01',
        '2026-09-08',
        '2026-09-15',
        '2026-09-22',
        '2026-09-29',
      ]);
    });

    it('ежемесячная задача даёт по вхождению в месяц, с переносом на конец месяца', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Ежемесячная',
        date: '2026-01-31',
        priority: 'medium',
        recurrence: 'monthly',
      });

      const list = await repository.listOccurrencesByRange('2026-01-01', '2026-03-31');

      expect(list.map((item) => item.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    });
  });

  describe('setCompleted', () => {
    it('ставит отметку выполнения на указанный день', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      await repository.setCompleted(created.id, '2026-09-15', true);

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list[0]?.done).toBe(true);
    });

    it('снимает поставленную отметку', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.setCompleted(created.id, '2026-09-15', true);

      await repository.setCompleted(created.id, '2026-09-15', false);

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list[0]?.done).toBe(false);
    });

    it('повторная отметка того же дня ничего не меняет', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      await repository.setCompleted(created.id, '2026-09-15', true);
      await repository.setCompleted(created.id, '2026-09-15', true);

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list).toHaveLength(1);
      expect(list[0]?.done).toBe(true);
    });

    it('снятие отметки, которой не было, не ломает выборку', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      await repository.setCompleted(created.id, '2026-09-15', false);

      expect((await repository.listOccurrencesByDate('2026-09-15'))[0]?.done).toBe(false);
    });

    it('отметка одного дня не отмечает другие дни той же регулярной задачи', async () => {
      const repository = new MemoryTaskRepository();
      const weekly = await repository.create({
        text: 'Еженедельная',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'weekly',
      });

      await repository.setCompleted(weekly.id, '2026-09-22', true);

      const list = await repository.listOccurrencesByRange('2026-09-15', '2026-09-29');

      expect(list.map((item) => item.date)).toEqual(['2026-09-15', '2026-09-22', '2026-09-29']);
      expect(list.map((item) => item.done)).toEqual([false, true, false]);
    });

    it('отметка не влияет на другую задачу того же дня', async () => {
      const repository = new MemoryTaskRepository();
      const first = await repository.create({
        text: 'Первая',
        date: '2026-09-15',
        priority: 'high',
        recurrence: 'none',
      });
      const second = await repository.create({
        text: 'Вторая',
        date: '2026-09-15',
        priority: 'low',
        recurrence: 'none',
      });

      await repository.setCompleted(first.id, '2026-09-15', true);

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list.map((item) => item.task.id)).toEqual([first.id, second.id]);
      expect(list.map((item) => item.done)).toEqual([true, false]);
    });

    it('отметка несуществующей задачи не ломает выборки', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      await repository.setCompleted('нет такой задачи', '2026-09-15', true);

      const day = await repository.listOccurrencesByDate('2026-09-15');
      const range = await repository.listOccurrencesByRange('2026-09-01', '2026-09-30');

      expect(day.map((item) => item.task.id)).toEqual([created.id]);
      expect(day.map((item) => item.done)).toEqual([false]);
      expect(range.map((item) => item.done)).toEqual([false]);
    });
  });

  describe('update', () => {
    it('меняет только переданные поля', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'low',
        recurrence: 'none',
      });

      const updated = await repository.update(created.id, { priority: 'high' });

      expect(updated?.priority).toBe('high');
      expect(updated?.text).toBe('Купить молоко');
      expect(updated?.date).toBe('2026-09-15');
      expect(updated?.createdAt).toBe(created.createdAt);
    });

    it('пересобирает токены поиска при смене текста', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      const updated = await repository.update(created.id, { text: 'Купить хлеб' });

      expect(updated?.searchTokens).toEqual(['купить', 'хлеб']);
      expect(await repository.search('молоко')).toEqual([]);
    });

    it('переносит задачу на другой день', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      await repository.update(created.id, { date: '2026-09-16' });

      const moved = await repository.listOccurrencesByDate('2026-09-16');

      expect(await repository.listOccurrencesByDate('2026-09-15')).toEqual([]);
      expect(moved.map((item) => item.task.id)).toEqual([created.id]);
    });

    it('обновляет updatedAt, не трогая createdAt', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.UTC(2026, 8, 15, 10, 0, 0));

      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      vi.setSystemTime(Date.UTC(2026, 8, 15, 11, 0, 0));

      const updated = await repository.update(created.id, { text: 'Задача с правкой' });

      expect(created.createdAt).toBe(Date.UTC(2026, 8, 15, 10, 0, 0));
      expect(updated?.createdAt).toBe(Date.UTC(2026, 8, 15, 10, 0, 0));
      expect(updated?.updatedAt).toBe(Date.UTC(2026, 8, 15, 11, 0, 0));
    });

    it('пустая правка сохраняет поля, но двигает updatedAt', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.UTC(2026, 8, 15, 10, 0, 0));

      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      vi.setSystemTime(Date.UTC(2026, 8, 15, 10, 0, 1));

      const updated = await repository.update(created.id, {});

      expect(updated?.text).toBe('Задача');
      expect(updated?.priority).toBe('medium');
      expect(updated?.updatedAt).toBe(Date.UTC(2026, 8, 15, 10, 0, 1));
    });

    it('на несуществующую задачу отдаёт null', async () => {
      const repository = new MemoryTaskRepository();

      expect(await repository.update('нет такой задачи', { text: 'Новый текст' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('удаляет существующую задачу и отдаёт true', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.remove(created.id)).toBe(true);
      expect(await repository.get(created.id)).toBeNull();
      expect(await repository.listOccurrencesByDate('2026-09-15')).toEqual([]);
    });

    it('на несуществующую задачу отдаёт false', async () => {
      const repository = new MemoryTaskRepository();

      expect(await repository.remove('нет такой задачи')).toBe(false);
    });

    it('повторное удаление отдаёт false', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Задача',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.remove(created.id);

      expect(await repository.remove(created.id)).toBe(false);
    });

    it('уносит отметки удалённой задачи', async () => {
      const repository = new MemoryTaskRepository();
      const weekly = await repository.create({
        text: 'Еженедельная',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'weekly',
      });
      await repository.setCompleted(weekly.id, '2026-09-15', true);
      await repository.setCompleted(weekly.id, '2026-09-22', true);

      await repository.remove(weekly.id);

      // Отметки удалённой задачи через выборки уже не видны — задачи нет, вхождений нет.
      // Поэтому каскад проверяется по самому набору отметок.
      const completions = Reflect.get(repository, 'completions') as Set<string>;

      expect(completions.size).toBe(0);
    });

    it('не уносит отметки других задач', async () => {
      const repository = new MemoryTaskRepository();
      const removed = await repository.create({
        text: 'Удаляемая',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      const kept = await repository.create({
        text: 'Остающаяся',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.setCompleted(removed.id, '2026-09-15', true);
      await repository.setCompleted(kept.id, '2026-09-15', true);

      await repository.remove(removed.id);

      const list = await repository.listOccurrencesByDate('2026-09-15');

      expect(list.map((item) => item.task.id)).toEqual([kept.id]);
      expect(list.map((item) => item.done)).toEqual([true]);
    });
  });

  describe('search', () => {
    it('находит по началу слова', async () => {
      const repository = new MemoryTaskRepository();
      const milk = await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.create({
        text: 'Позвонить маме',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      const found = await repository.search('мол');

      expect(found.map((task) => task.id)).toEqual([milk.id]);
    });

    it('находит по слову из середины текста', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Купить молоко в магазине',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      const found = await repository.search('магазине');

      expect(found.map((task) => task.id)).toEqual([created.id]);
    });

    it('не различает регистр и ё', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Нарядить Ёлку',
        date: '2026-12-31',
        priority: 'low',
        recurrence: 'none',
      });

      const found = await repository.search('ЕЛК');

      expect(found.map((task) => task.id)).toEqual([created.id]);
    });

    it('без совпадений отдаёт пустой список', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.search('велосипед')).toEqual([]);
    });

    it('пустой запрос отдаёт пустой список', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.search('   ')).toEqual([]);
      expect(await repository.search('!!!')).toEqual([]);
    });

    it('не находит по середине слова — заявленная граница подхода', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Сходить в магазин',
        date: '2026-09-15',
        priority: 'low',
        recurrence: 'none',
      });

      expect(await repository.search('ажин')).toEqual([]);
    });

    it('соблюдает лимит выдачи', async () => {
      const repository = new MemoryTaskRepository();

      for (const date of ['2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15']) {
        await repository.create({
          text: `Купить молоко ${date}`,
          date,
          priority: 'medium',
          recurrence: 'none',
        });
      }

      const found = await repository.search('молоко', 3);

      expect(found).toHaveLength(3);
      expect(found.map((task) => task.date)).toEqual(['2026-09-11', '2026-09-12', '2026-09-13']);
    });

    it('нулевой лимит отдаёт пустой список', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.search('молоко', 0)).toEqual([]);
    });

    it('без лимита отдаёт все совпадения', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.create({
        text: 'Молоко закончилось',
        date: '2026-09-16',
        priority: 'low',
        recurrence: 'none',
      });

      expect(await repository.search('молоко')).toHaveLength(2);
    });

    it('не находит, когда слова запроса есть по отдельности, а сочетания нет', async () => {
      const repository = new MemoryTaskRepository();
      await repository.create({
        text: 'Купить хлеб, молоко уже есть',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });

      expect(await repository.search('купить молоко')).toEqual([]);
    });

    it('не находит удалённую задачу', async () => {
      const repository = new MemoryTaskRepository();
      const created = await repository.create({
        text: 'Купить молоко',
        date: '2026-09-15',
        priority: 'medium',
        recurrence: 'none',
      });
      await repository.remove(created.id);

      expect(await repository.search('молоко')).toEqual([]);
    });
  });
});
