import Fraction from 'fraction.js';
import { IECFactors, IECBaseUnits, SIBaseUnits, SIFactors } from './systems';
import { Unit } from './Unit';
import { isUnit } from './types';
import { Quantity } from './Quantity';
import { UnitSystem } from './UnitSystem';
import { beforeAll, describe, test, expect } from 'bun:test';

const fr = (a: number, b?: number) => new Fraction(a, b);

const baseUnits = {
    ...SIBaseUnits,
    ...IECBaseUnits,
    '%': {},
};

const factors = {
    ...SIFactors,
    ...IECFactors,
};

type U = typeof baseUnits;
type F = typeof factors;
type D = {};

let unitSystem: UnitSystem<U, F, D>;

const unit: typeof unitSystem.createUnit = (...args) =>
    unitSystem.createUnit(...args);

beforeAll(() => {
    unitSystem = new UnitSystem(baseUnits, factors, {});
});

describe('unit ops', () => {
    test('exponentOf', () => {
        const u = unit({
            m: fr(1),
            s: fr(3),
            A: fr(-4),
            cd: fr(420),
        });

        expect(u.exponentOf('mol').valueOf()).toBe(0);
        expect(u.exponentOf('g').valueOf()).toBe(0);
        expect(u.exponentOf('cd').valueOf()).toBe(420);
        expect(u.exponentOf('A').valueOf()).toBe(-4);
        expect(u.exponentOf('s').valueOf()).toBe(3);
        expect(u.exponentOf('m').valueOf()).toBe(1);
    });

    test('isUnit', () => {
        expect(isUnit(4)).toBeFalse();
        expect(isUnit({})).toBeFalse();
        expect(isUnit([])).toBeFalse();
        expect(isUnit(new Quantity(4, unit({})))).toBeFalse();

        expect(isUnit(unit({ m: fr(1) }))).toBeTrue();
        expect(isUnit(unit({}, { mul: 1, base: 10, exp: fr(0) }))).toBeTrue();
        expect(isUnit(unitSystem.parseUnit('km'))).toBeTrue();
    });

    test('isUnitless', () => {
        expect(unit({}).isUnitless).toBe(true);
        expect(unit({ m: fr(1) }).isUnitless).toBe(false);
        expect(unit({ s: fr(0), A: undefined }).isUnitless).toBe(true);
    });

    test('isEqual', () => {
        const equals = [
            unit({ m: fr(2) }),
            unit({ m: fr(2) }, { mul: 1, base: 10, exp: fr(0) }),
            unit({ m: fr(2) }, { mul: 1, base: 2, exp: fr(0) }),
        ];
        const nonequals = [
            unit({ m: fr(3) }),
            unit({ s: fr(2) }),
            unit({ m: fr(2) }, { mul: 2, base: 10, exp: fr(0) }),
            unit({ m: fr(2) }, { mul: 1, base: 2, exp: fr(1) }),
        ];

        for (const a of equals) {
            for (const b of equals) {
                expect(a.isEqual(b)).toBe(true);
            }
            for (const b of nonequals) {
                expect(a.isEqual(b)).toBe(false);
            }
        }
    });

    test('isEqual distinguishes mul from base^exp', () => {
        const a = unit({ m: fr(1) }, { mul: 10, base: 10, exp: fr(1) });
        const b = unit({ m: fr(1) }, { mul: 1, base: 10, exp: fr(2) });
        expect(a.isEqual(b)).toBe(false);
    });

    test('inverse', () => {
        const u = unit(
            {
                mol: fr(2),
                s: fr(-4),
                g: fr(1),
                A: fr(0),
                cd: undefined,
            },
            { mul: 2, base: 10, exp: fr(2) },
        );
        const v = unit(
            {
                mol: fr(-2),
                s: fr(4),
                g: fr(-1),
            },
            { mul: 1 / 2, base: 10, exp: fr(-2) },
        );

        expect(u.inverse().isEqual(v)).toBe(true);
    });

    test('pow', () => {
        const u = unit({
            mol: fr(2),
            s: fr(-4),
            g: fr(1),
            K: undefined,
            B: fr(0),
        });
        const v = unit({
            mol: fr(-3, 2),
            s: fr(3),
            g: fr(-3, 4),
        });
        const w = u.pow(fr(-3, 4));

        expect(w.exponentOf('mol').valueOf()).toBe(
            v.exponentOf('mol').valueOf(),
        );
        expect(w.exponentOf('s').valueOf()).toBe(v.exponentOf('s').valueOf());
        expect(w.exponentOf('g').valueOf()).toBe(v.exponentOf('g').valueOf());
        expect(w.exponentOf('A').valueOf()).toBe(v.exponentOf('A').valueOf());
        expect(w.isEqual(v)).toBe(true);
    });

    test('multiply base', () => {
        const one = unit({});
        const m = unit({ m: fr(1), A: undefined });
        const m2 = unit({ m: fr(2), K: fr(0) });
        const s = unit({ s: fr(1) });
        const m2s = unit({ m: fr(2), s: fr(1) });
        const mps = unit({ m: fr(1), s: fr(-1) });

        expect(one.multiply(one).isEqual(one)).toBe(true);
        expect(one.multiply(m).isEqual(m)).toBe(true);
        expect(m.multiply(m).isEqual(m2)).toBe(true);
        expect(m.multiply(s).multiply(m).isEqual(m2s)).toBe(true);
        expect(s.multiply(m2).isEqual(m2s)).toBe(true);
        expect(m.divide(s).isEqual(mps)).toBe(true);
    });

    test('multiply different bases', () => {
        const ks = unit({ s: fr(1) }, 'k');
        const MiB = unit({ B: fr(1) }, 'Mi');

        const kbps = MiB.divide(ks);
        expect(kbps.multiplyValueByFactor(1)).toBeCloseTo(1048.576);

        const kbps2 = ks.inverse().multiply(MiB);
        expect(kbps2.multiplyValueByFactor(1)).toBeCloseTo(1048.576);
    });

    test('multiply by scalar', () => {
        const meter = unit({ m: fr(1) });

        const twoMeters = meter.multiply(2);
        expect(twoMeters.factor.mul).toBe(2);
        expect(twoMeters.toString()).toBe('2 m');

        const sixMeters = twoMeters.multiply(3);
        expect(sixMeters.factor.mul).toBe(6);
        expect(sixMeters.toString()).toBe('6 m');
    });

    test('multipy realworld', () => {
        const c = unit(
            { m: fr(1), s: fr(-1) },
            { mul: 3, base: 10, exp: fr(8) },
        );
        const mu0 = unit(
            { g: fr(1), m: fr(1), s: fr(-2), A: fr(-2) },
            { mul: 4 * 3.14, base: 10, exp: fr(-7 + 3) },
        );
        const epsilon0 = mu0.multiply(c.pow(fr(2))).inverse();

        expect(epsilon0.baseUnits).toEqual({
            A: fr(2),
            s: fr(4),
            g: fr(-1),
            m: fr(-3),
        });

        const value =
            epsilon0.factor.mul * epsilon0.factor.base ** +epsilon0.factor.exp;

        expect(value).toBeCloseTo(1 / (4 * 3.14 * 3e8 ** 2));

        expect(epsilon0.divideValueByFactor(value)).toBeCloseTo(1);
    });

    test('multiply edge cases', () => {
        const a = unit({}, { mul: 1, base: 1, exp: fr(1) });
        expect(a.multiply(a).multiplyValueByFactor(1)).toBe(1);
        expect(a.divide(a).multiplyValueByFactor(1)).toBe(1);
    });

    test('withFactor', () => {
        const kilo = unit({}, { mul: 1, base: 10, exp: fr(3) });
        const m = unit({ m: fr(1) });
        const km = m.withFactor({ exp: fr(3) });

        expect(kilo.multiply(m).isEqual(km)).toBe(true);
    });

    test('unit conversions', () => {
        const m = unit({ m: fr(1) });
        const km = m.withFactor({ exp: fr(3) });
        const cm = m.withFactor({ exp: fr(-2) });

        expect(m.conversionFactorTo(km)).toBeCloseTo(0.001);
        expect(m.conversionFactorFrom(km)).toBeCloseTo(1000);

        expect(m.conversionFactorTo(cm)).toBeCloseTo(100);
        expect(m.conversionFactorFrom(cm)).toBeCloseTo(0.01);

        expect(cm.conversionFactorTo(km)).toBeCloseTo(1e-5);
        expect(cm.conversionFactorFrom(km)).toBeCloseTo(1e5);
    });
});

describe('unit parsing', () => {
    test('unity', () => {
        const a = unit({});
        const b = unitSystem.parseUnit('');
        const c = unitSystem.parseUnit('1');

        expect(a.isEqual(b)).toBe(true);
        expect(b.isEqual(c)).toBe(true);
        expect(a.isEqual(c)).toBe(true);
    });

    test('from text', () => {
        const testVals: [string, Unit<U, F, D>][] = [
            ['K', unit({ K: fr(1) })],
            ['m', unit({ m: fr(1) })],
            // with a known factor
            ['kK', unit({ K: fr(1) }, { base: 10, exp: fr(3), mul: 1 })],
            // with reduntant space
            ['k K', unit({ K: fr(1) }, { base: 10, exp: fr(3), mul: 1 })],
            [
                'g s',
                unit({
                    g: fr(1),
                    s: fr(1),
                }),
            ],
            [
                'm / s',
                unit({
                    m: fr(1),
                    s: fr(-1),
                }),
            ],
            [
                's^-2 m^-3',
                unit({
                    m: fr(-3),
                    s: fr(-2),
                }),
            ],
            [
                'm^3 / (kg s^2)',
                unit(
                    {
                        m: fr(3),
                        s: fr(-2),
                        g: fr(-1),
                    },
                    { mul: 1, base: 10, exp: fr(-3) },
                ),
            ],
            // TODO: scientific factor
            // TODO: negative exponent
            // TODO: fractional exponent
        ];

        for (const [toParse, unit] of testVals) {
            const parsed = unitSystem.parseUnit(toParse);
            expect(parsed.isEqual(unit)).toBe(true);
        }
    });

    test('percent symbol', () => {
        const c = unitSystem.parseUnit('%');

        expect(c.isEqual(unit({ '%': fr(1) }))).toBe(true);
    });
});

describe('unit printing', () => {
    test('with different bases', () => {
        expect(unitSystem.parseUnit('s').toString()).toBe('s');
        expect(unitSystem.parseUnit('us').toString()).toBe('us');
        expect(unitSystem.parseUnit('km').toString()).toBe('km');
        expect(unitSystem.parseUnit('KiB').toString()).toBe('KiB');
    });

    test('with denominator', () => {
        expect(unit({ s: fr(-1), A: fr(0) }).toString()).toBe('1 / s');
        expect(unitSystem.parseUnit('1 / s').toString()).toBe('1 / s');
        expect(unit({ s: fr(-1) }, 'k').toString()).toBe('1 / ms');
        expect(unit({ m: fr(1, 2), K: fr(-1) }).toString()).toBe('m^1/2 / K');

        expect(unit({ s: fr(-1), A: fr(0) }).toString({ compact: true })).toBe(
            '1/s',
        );
    });

    test('with factor', () => {
        expect(
            unit(
                { A: fr(1), B: undefined },
                { mul: 24, base: 10, exp: fr(0) },
            ).toString(),
        ).toBe('24 A');

        expect(
            unit({ A: fr(1) }, { mul: 3, base: 24, exp: fr(1) }).toString(),
        ).toBe('3 * 24 A');

        expect(
            unit({ A: fr(1) }, { mul: 24, base: 3, exp: fr(5) }).toString(),
        ).toBe('24 * 3^5 A');

        expect(
            unit({ A: fr(1) }, { mul: 1, base: 10, exp: fr(6) }).toString(),
        ).toBe('MA');
    });

    test('inverse units with factor', () => {
        expect(unit({ s: fr(-1) }, 'k').toString()).toBe('1 / ms');

        expect(unit({ s: fr(-1) }, 'k').toString({ compact: true })).toBe(
            '1/ms',
        );

        expect(
            unit({ s: fr(-1) }, 'k').toString({
                fancyUnicode: true,
                useNegativeExponents: true,
            }),
        ).toBe('ms⁻¹');

        expect(unit({ B: fr(-1) }, 'Ki').toString()).toBe('2^10 / B');
    });

    test('pretty unicode', () => {
        expect(
            unit({ m: fr(3), g: fr(0), s: fr(8) }).toString({
                fancyUnicode: true,
            }),
        ).toBe('m³ s⁸');

        expect(
            unit({ A: fr(2), s: fr(4), g: fr(-1), m: fr(-3) }).toString({
                fancyUnicode: true,
            }),
        ).toBe('A² s⁴ / (g m³)');

        expect(
            unit({ A: fr(2), s: fr(4), g: fr(-1), m: fr(-3) }).toString({
                fancyUnicode: true,
                useNegativeExponents: true,
            }),
        ).toBe('A² s⁴ g⁻¹ m⁻³');

        expect(unit({ m: fr(1, 2) }).toString({ fancyUnicode: true })).toBe(
            'm¹⸍²',
        );
    });
});

describe('factor inference', () => {
    test('factorless base', () => {
        const u = unit({ s: fr(1) }, { base: 10, exp: fr(0), mul: 1 });

        const test = [
            [0, 's'],
            [10_000, 'ks'],
            [6_900_000, 'Ms'],
            [0.5e-2, 'ms'],
            [2e-7, 'ns'],
            [12, 'das'],
            [7, 's'],
            [NaN, 's'],
            [Infinity, 's'],
        ] as const;

        for (const [val, expected] of test) {
            expect(u.withBestFactorFor(val).toString()).toEqual(expected);
        }
    });

    test('base with factor', () => {
        const u = unit({ s: fr(1) }, { base: 10, exp: fr(3), mul: 1 });

        const test = [
            [10_000, 'Ms'],
            [6_900_000, 'Gs'],
            [0.5e-2, 's'],
            [2e-7, 'us'],
            [12, 'ks'],
            [7, 'ks'],
        ] as const;

        for (const [val, expected] of test) {
            expect(u.withBestFactorFor(val).toString()).toEqual(expected);
        }
    });
});

describe('formating to string', () => {
    test('basic', () => {
        expect(unit({}, { mul: 1, base: 10, exp: fr(0) }).toString()).toEqual(
            '1',
        );

        expect(
            unit({ s: fr(1) }, { mul: 1, base: 10, exp: fr(-3) }).toString(),
        ).toEqual('ms');

        expect(unitSystem.parseUnit('km').toString()).toEqual('km');

        expect(unit({}, { mul: 1, base: 10, exp: fr(-3) }).toString()).toEqual(
            '10^-3',
        );
    });
});
