import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VOICE_MODELS,
  downloadPercent,
  findVoiceModel,
  formatGigabytes,
  formatMegabytes,
  loadServerAddress,
  loadVoiceModel,
  modelFileUrl,
  normalizeServerAddress,
  saveServerAddress,
  saveVoiceModel,
} from './voice-models';
import type { VoiceModel } from './voice-models';

/** Хранилище настроек в памяти вместо localStorage, которого в окружении node нет. */
function stubStorage(initial: Record<string, string> = {}): Map<string, string> {
  const data = new Map(Object.entries(initial));

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  });

  return data;
}

/** localStorage, бросающий исключение на каждом обращении, — как в приватном режиме. */
function stubBrokenStorage(): void {
  const fail = (): never => {
    throw new Error('хранилище недоступно');
  };

  vi.stubGlobal('localStorage', { getItem: fail, setItem: fail });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('каталог моделей', () => {
  it('содержит Gemma 4 E2B с именем файла и точным размером', () => {
    expect(VOICE_MODELS).toEqual([
      { id: 'gemma-4-e2b', title: 'Gemma 4 E2B', fileName: 'gemma-4-E2B-it.litertlm', size: 2588147712 },
    ]);
  });

  it('находит модель по идентификатору', () => {
    expect(findVoiceModel('gemma-4-e2b').fileName).toBe('gemma-4-E2B-it.litertlm');
  });

  it('неизвестный, пустой и отсутствующий идентификатор дают модель по умолчанию', () => {
    expect(findVoiceModel('gemma-9').id).toBe('gemma-4-e2b');
    expect(findVoiceModel('').id).toBe('gemma-4-e2b');
    expect(findVoiceModel(null).id).toBe('gemma-4-e2b');
  });
});

describe('normalizeServerAddress', () => {
  it('адрес без схемы получает http://', () => {
    expect(normalizeServerAddress('192.168.1.10:8088')).toBe('http://192.168.1.10:8088');
    expect(normalizeServerAddress('localhost:8088')).toBe('http://localhost:8088');
    expect(normalizeServerAddress('desktop.local')).toBe('http://desktop.local');
  });

  it('схема http и https сохраняется, регистр схемы и хоста приводится к нижнему', () => {
    expect(normalizeServerAddress('http://10.0.2.2:8088')).toBe('http://10.0.2.2:8088');
    expect(normalizeServerAddress('https://models.example')).toBe('https://models.example');
    expect(normalizeServerAddress('HTTP://Desktop.LOCAL:8088')).toBe('http://desktop.local:8088');
  });

  it('убирает пробелы по краям и все / в конце', () => {
    expect(normalizeServerAddress('  192.168.1.10:8088/  ')).toBe('http://192.168.1.10:8088');
    expect(normalizeServerAddress('http://192.168.1.10:8088///')).toBe('http://192.168.1.10:8088');
  });

  it('сохраняет путь каталога на сервере', () => {
    expect(normalizeServerAddress('192.168.1.10:8088/models/')).toBe('http://192.168.1.10:8088/models');
  });

  it('порт по умолчанию для схемы опускается, остальные сохраняются', () => {
    expect(normalizeServerAddress('http://192.168.1.10:80')).toBe('http://192.168.1.10');
    expect(normalizeServerAddress('https://192.168.1.10:443/')).toBe('https://192.168.1.10');
    expect(normalizeServerAddress('192.168.1.10:1')).toBe('http://192.168.1.10:1');
    expect(normalizeServerAddress('192.168.1.10:65535')).toBe('http://192.168.1.10:65535');
  });

  it('порт вне диапазона, ноль и не число — неверный адрес', () => {
    expect(normalizeServerAddress('192.168.1.10:65536')).toBeNull();
    expect(normalizeServerAddress('192.168.1.10:-1')).toBeNull();
    expect(normalizeServerAddress('192.168.1.10:port')).toBeNull();
    expect(normalizeServerAddress('192.168.1.10:0')).toBeNull();
    expect(normalizeServerAddress('192.168.1.10:00')).toBeNull();
    expect(normalizeServerAddress('http://192.168.1.10:0/')).toBeNull();
  });

  it('опечатка в схеме и пустой порт — неверный адрес, а не хост «http»', () => {
    expect(normalizeServerAddress('http:/192.168.0.1')).toBeNull();
    expect(normalizeServerAddress('HTTPS:/192.168.0.1:8088')).toBeNull();
    expect(normalizeServerAddress('http//192.168.0.1')).toBeNull();
    expect(normalizeServerAddress('https//192.168.0.1:8088')).toBeNull();
    expect(normalizeServerAddress('http:192.168.0.1')).toBeNull();
    expect(normalizeServerAddress('http:8088')).toBeNull();
    expect(normalizeServerAddress('192.168.0.1:/models')).toBeNull();
  });

  it('имя хоста, лишь начинающееся с http, — верный адрес', () => {
    expect(normalizeServerAddress('httpserver:8088')).toBe('http://httpserver:8088');
  });

  it('адрес с именем пользователя или паролем — null: раздача их не принимает', () => {
    expect(normalizeServerAddress('user:pw@192.168.0.1:8088')).toBeNull();
    expect(normalizeServerAddress('http://user@192.168.0.1:8088')).toBeNull();
    expect(normalizeServerAddress('http://:pw@192.168.0.1:8088')).toBeNull();
  });

  it('IPv6 — только в квадратных скобках', () => {
    expect(normalizeServerAddress('[fe80::1]:8088')).toBe('http://[fe80::1]:8088');
    expect(normalizeServerAddress('http://[::1]/models/')).toBe('http://[::1]/models');
    expect(normalizeServerAddress('fe80::1')).toBeNull();
    expect(normalizeServerAddress('[fe80::1')).toBeNull();
  });

  it('пустой ввод и одни пробелы — null', () => {
    expect(normalizeServerAddress('')).toBeNull();
    expect(normalizeServerAddress('   ')).toBeNull();
  });

  it('схемы кроме http и https — null', () => {
    expect(normalizeServerAddress('ftp://192.168.1.10')).toBeNull();
    expect(normalizeServerAddress('file:///sdcard/model')).toBeNull();
  });

  it('адрес без хоста и с пробелом в хосте — null', () => {
    expect(normalizeServerAddress('http://')).toBeNull();
    expect(normalizeServerAddress('192.168 .1.10')).toBeNull();
  });

  it('адрес с параметрами или якорем — null: к нему не приписать имя файла', () => {
    expect(normalizeServerAddress('192.168.1.10:8088/?a=1')).toBeNull();
    expect(normalizeServerAddress('192.168.1.10:8088#x')).toBeNull();
  });
});

describe('modelFileUrl', () => {
  const model: VoiceModel = { id: 'm', title: 'M', fileName: 'gemma-4-E2B-it.litertlm', size: 1 };

  it('приписывает имя файла к адресу сервера через /', () => {
    expect(modelFileUrl('http://192.168.1.10:8088', model)).toBe(
      'http://192.168.1.10:8088/gemma-4-E2B-it.litertlm',
    );
    expect(modelFileUrl('http://host/models', model)).toBe('http://host/models/gemma-4-E2B-it.litertlm');
  });

  it('кодирует в имени файла символы, недопустимые в адресе', () => {
    expect(modelFileUrl('http://host', { ...model, fileName: 'a b#1.bin' })).toBe('http://host/a%20b%231.bin');
  });
});

describe('запоминание выбора модели и адреса', () => {
  it('без сохранённого выбора — модель по умолчанию и пустой адрес', () => {
    stubStorage();

    expect(loadVoiceModel().id).toBe('gemma-4-e2b');
    expect(loadServerAddress()).toBe('');
  });

  it('сохраняет и читает модель по идентификатору и адрес как введён', () => {
    const data = stubStorage();

    saveVoiceModel(VOICE_MODELS[0]);
    saveServerAddress('192.168.1.10:8088');

    expect(data.get('secretar.voice.model')).toBe('gemma-4-e2b');
    expect(data.get('secretar.voice.server')).toBe('192.168.1.10:8088');
    expect(loadVoiceModel().id).toBe('gemma-4-e2b');
    expect(loadServerAddress()).toBe('192.168.1.10:8088');
  });

  it('сохранённый идентификатор исчезнувшей модели даёт модель по умолчанию', () => {
    stubStorage({ 'secretar.voice.model': 'old-model' });

    expect(loadVoiceModel().id).toBe('gemma-4-e2b');
  });

  it('недоступное хранилище: чтение даёт умолчания, запись не бросает', () => {
    stubBrokenStorage();

    expect(loadVoiceModel().id).toBe('gemma-4-e2b');
    expect(loadServerAddress()).toBe('');
    expect(() => saveVoiceModel(VOICE_MODELS[0])).not.toThrow();
    expect(() => saveServerAddress('x')).not.toThrow();
  });
});

describe('вид размеров', () => {
  it('мегабайты — целые, вниз, с разделением разрядов неразрывным пробелом', () => {
    expect(formatMegabytes(0)).toBe('0 МБ');
    expect(formatMegabytes(999_999)).toBe('0 МБ');
    expect(formatMegabytes(1_000_000)).toBe('1 МБ');
    expect(formatMegabytes(254_111_299)).toBe('254 МБ');
    expect(formatMegabytes(2_588_147_712)).toBe('2 588 МБ');
  });

  it('гигабайты — два знака после запятой', () => {
    expect(formatGigabytes(2_588_147_712)).toBe('2,59 ГБ');
    expect(formatGigabytes(0)).toBe('0,00 ГБ');
    expect(formatGigabytes(1_000_000_000)).toBe('1,00 ГБ');
    expect(formatGigabytes(4_994_999_999)).toBe('4,99 ГБ');
  });

  it('процент — вниз, 100 только у полного файла', () => {
    expect(downloadPercent(0, 2_588_147_712)).toBe(0);
    expect(downloadPercent(1_294_073_856, 2_588_147_712)).toBe(50);
    expect(downloadPercent(2_588_147_711, 2_588_147_712)).toBe(99);
    expect(downloadPercent(2_588_147_712, 2_588_147_712)).toBe(100);
  });

  it('процент не выходит за 0…100', () => {
    expect(downloadPercent(300, 200)).toBe(100);
    expect(downloadPercent(-5, 200)).toBe(0);
  });

  it('неизвестный и нулевой общий размер — процента нет', () => {
    expect(downloadPercent(100, null)).toBeNull();
    expect(downloadPercent(100, 0)).toBeNull();
    expect(downloadPercent(0, -1)).toBeNull();
  });
});
