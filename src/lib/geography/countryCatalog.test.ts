import { currencyCatalog } from '@/lib/currency/currencyCatalog';
import {
  countryCatalog,
  getCountryFlag,
  searchCountryCatalog,
} from '@/lib/geography/countryCatalog';

describe('countryCatalog', () => {
  it('incluye un país por cada nombre listado en currencyCatalog, salvo la Unión Europea', () => {
    const expectedCount = currencyCatalog
      .flatMap((entry) => entry.countries)
      .filter((name) => name !== 'Unión Europea').length;

    expect(countryCatalog).toHaveLength(expectedCount);
  });

  it('no incluye la entrada agregada "Unión Europea"', () => {
    expect(countryCatalog.some((entry) => entry.name === 'Unión Europea')).toBe(
      false,
    );
  });

  it('asocia cada país a la moneda que lo lista en currencyCatalog', () => {
    expect(
      countryCatalog.find((entry) => entry.name === 'España')?.currencyCode,
    ).toBe('EUR');
    expect(
      countryCatalog.find((entry) => entry.name === 'México')?.currencyCode,
    ).toBe('MXN');
  });

  it('no tiene países duplicados', () => {
    const names = countryCatalog.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('getCountryFlag', () => {
  it('calcula la bandera a partir del código ISO2, en mayúsculas o minúsculas', () => {
    expect(getCountryFlag('ES')).toBe('🇪🇸');
    expect(getCountryFlag('es')).toBe('🇪🇸');
    expect(getCountryFlag('MX')).toBe('🇲🇽');
    expect(getCountryFlag('US')).toBe('🇺🇸');
  });

  it('da una bandera distinta por país aunque compartan moneda', () => {
    expect(getCountryFlag('ES')).not.toBe(getCountryFlag('DE'));
  });
});

describe('searchCountryCatalog', () => {
  it('devuelve el catálogo completo cuando la búsqueda está vacía', () => {
    expect(searchCountryCatalog('  ')).toHaveLength(countryCatalog.length);
  });

  it('encuentra un país por nombre, con o sin acentos', () => {
    expect(searchCountryCatalog('mexico').map((entry) => entry.iso2)).toEqual([
      'MX',
    ]);
    expect(searchCountryCatalog('México').map((entry) => entry.iso2)).toEqual([
      'MX',
    ]);
  });

  it('no encuentra nada con una búsqueda sin coincidencias', () => {
    expect(searchCountryCatalog('atlantida')).toEqual([]);
  });
});
