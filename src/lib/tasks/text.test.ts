import { describe, expect, it } from 'vitest';
import { matchesSearchQuery, normalizeText, parseSearchQuery, tokenize } from './text';

describe('normalizeText', () => {
  it('пустую строку оставляет пустой', () => {
    expect(normalizeText('')).toBe('');
  });

  it('строку из пробелов сводит к пустой', () => {
    expect(normalizeText('   \t\n  ')).toBe('');
  });

  it('приводит к нижнему регистру', () => {
    expect(normalizeText('КуПиТь МоЛоКо')).toBe('купить молоко');
  });

  it('заменяет ё на е в обоих регистрах', () => {
    expect(normalizeText('Ёжик и ёлка')).toBe('ежик и елка');
  });

  it('схлопывает пробелы и обрезает края', () => {
    expect(normalizeText('  купить   молоко  ')).toBe('купить молоко');
  });

  it('пунктуацию не удаляет', () => {
    expect(normalizeText('Купить: молоко, хлеб!')).toBe('купить: молоко, хлеб!');
  });
});

describe('tokenize', () => {
  it('пустая строка даёт пустой список', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('строка из одной пунктуации даёт пустой список', () => {
    expect(tokenize('!!! ... ?!- ,;:()')).toEqual([]);
  });

  it('разделяет по пунктуации и пробелам', () => {
    expect(tokenize('Купить: молоко, хлеб!')).toEqual(['купить', 'молоко', 'хлеб']);
  });

  it('убирает повторы, сохраняя порядок первого появления', () => {
    expect(tokenize('купить молоко, купить хлеб, молоко')).toEqual([
      'купить',
      'молоко',
      'хлеб',
    ]);
  });

  it('приводит ё к е и не различает регистр', () => {
    expect(tokenize('Ёлка ёлка ЕЛКА')).toEqual(['елка']);
  });

  it('оставляет цифры как токены', () => {
    expect(tokenize('Оплатить 2 счёта до 15.09.2026')).toEqual([
      'оплатить',
      '2',
      'счета',
      'до',
      '15',
      '09',
      '2026',
    ]);
  });

  it('разбирает кириллицу и латиницу вперемешку', () => {
    expect(tokenize('Позвонить в Support по e-mail')).toEqual([
      'позвонить',
      'в',
      'support',
      'по',
      'e',
      'mail',
    ]);
  });

  it('на длинном тексте из повторов даёт один токен', () => {
    expect(tokenize('слово '.repeat(5000))).toEqual(['слово']);
  });

  it('длинное слово остаётся одним токеном', () => {
    const word = 'а'.repeat(5000);

    expect(tokenize(word)).toEqual([word]);
  });

  it('подчёркивание считается разделителем', () => {
    expect(tokenize('отчёт_за_май')).toEqual(['отчет', 'за', 'май']);
  });
});

describe('parseSearchQuery', () => {
  it('нормализует запрос и раскладывает его на токены', () => {
    expect(parseSearchQuery('  Купить  Молоко ')).toEqual({
      needle: 'купить молоко',
      tokens: ['купить', 'молоко'],
    });
  });

  it('обрезает пунктуацию по краям запроса', () => {
    expect(parseSearchQuery('«молоко»,')).toEqual({
      needle: 'молоко',
      tokens: ['молоко'],
    });
  });

  it('запрос без букв и цифр даёт пустые токены', () => {
    expect(parseSearchQuery('!!!')).toEqual({ needle: '', tokens: [] });
  });
});

describe('matchesSearchQuery', () => {
  const text = 'Купить молоко в магазине';
  const tokens = ['купить', 'молоко', 'в', 'магазине'];

  it('находит по началу слова', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('мол'))).toBe(true);
  });

  it('находит по целому слову из середины текста', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('магазине'))).toBe(true);
  });

  it('не различает регистр и ё', () => {
    expect(
      matchesSearchQuery('Купить ёлку', ['купить', 'елку'], parseSearchQuery('ЁЛК')),
    ).toBe(true);
  });

  it('не находит по середине слова — заявленная граница подхода', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('азине'))).toBe(false);
  });

  it('не находит, когда слова запроса есть по отдельности, а сочетания нет', () => {
    expect(
      matchesSearchQuery(
        'Купить хлеб, молоко уже есть',
        ['купить', 'хлеб', 'молоко', 'уже', 'есть'],
        parseSearchQuery('купить молоко'),
      ),
    ).toBe(false);
  });

  it('находит сочетание слов подряд', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('купить молоко'))).toBe(true);
  });

  it('пустой запрос не подходит ни под что', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('   '))).toBe(false);
  });

  it('запрос из одной пунктуации не подходит ни под что', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('...'))).toBe(false);
  });

  it('не находит отсутствующее слово', () => {
    expect(matchesSearchQuery(text, tokens, parseSearchQuery('хлеб'))).toBe(false);
  });
});
