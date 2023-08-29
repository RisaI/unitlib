import Fraction from 'fraction.js';
import {
    BinaryFactors,
    CompsciBaseUnits,
    SIBaseUnits,
    SIFactors,
} from './definitions';
import { Unit } from './Unit';
import { UnitSystem } from './UnitSystem';

const fr = (a: number, b?: number) => new Fraction(a, b);

const baseUnits = {
    ...SIBaseUnits,
    ...CompsciBaseUnits,
};

const factors = {
    ...SIFactors,
    ...BinaryFactors,
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

    test('isUnitless', () => {
        expect(unit({}).isUnitless).toBe(true);
        expect(unit({ m: fr(1) }).isUnitless).toBe(false);
    });

    test('isEqual', () => {
        const equals = [
            unit({ m: fr(2) }),
            unit({ m: fr(2) }, { mul: 1, base: 10, exp: 0 }),
            unit({ m: fr(2) }, { mul: 1, base: 2, exp: 0 }),
        ];
        const nonequals = [
            unit({ m: fr(3) }),
            unit({ s: fr(2) }),
            unit({ m: fr(2) }, { mul: 2, base: 10, exp: 0 }),
            unit({ m: fr(2) }, { mul: 1, base: 2, exp: 1 }),
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
        const a = unit({ m: fr(1) }, { mul: 10, base: 10, exp: 1 });
        const b = unit({ m: fr(1) }, { mul: 1, base: 10, exp: 2 });
        expect(a.isEqual(b)).toBe(false);
    });

    test('inverse', () => {
        const u = unit({
            mol: fr(2),
            s: fr(-4),
            g: fr(1),
        });
        const v = unit({
            mol: fr(-2),
            s: fr(4),
            g: fr(-1),
        });

        expect(u.inverse().isEqual(v)).toBe(true);
    });

    test('pow', () => {
        const u = unit({
            mol: fr(2),
            s: fr(-4),
            g: fr(1),
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
        const m = unit({ m: fr(1) });
        const m2 = unit({ m: fr(2) });
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

    test('multipy realworld', () => {
        const c = unit({ m: fr(1), s: fr(-1) }, { mul: 3, base: 10, exp: 8 });
        const mu0 = unit(
            { g: fr(1), m: fr(1), s: fr(-2), A: fr(-2) },
            { mul: 4 * 3.14, base: 10, exp: -7 + 3 },
        );
        const epsilon0 = mu0.multiply(c.pow(fr(2))).inverse();

        expect(epsilon0.baseUnits).toEqual({
            A: fr(2),
            s: fr(4),
            g: fr(-1),
            m: fr(-3),
        });

        const value =
            epsilon0.factor.mul * epsilon0.factor.base ** epsilon0.factor.exp;

        expect(value).toBeCloseTo(1 / (4 * 3.14 * 3e8 ** 2));

        expect(epsilon0.applyFactor(value)).toBeCloseTo(1);
    });

    test('withFactor', () => {
        const kilo = unit({}, { mul: 1, base: 10, exp: 3 });
        const m = unit({ m: fr(1) });
        const km = m.withFactor({ exp: 3 });

        expect(kilo.multiply(m).isEqual(km)).toBe(true);
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
            ['kK', unit({ K: fr(1) }, { base: 10, exp: 3, mul: 1 })],
            // with reduntant space
            ['k K', unit({ K: fr(1) }, { base: 10, exp: 3, mul: 1 })],
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
                    { mul: 1, base: 10, exp: -3 },
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
});

describe('unit printing', () => {
    test('with denominator', () => {
        expect(unit({ s: fr(-1), A: fr(0) }).toString()).toBe('1 / s');
        expect(unitSystem.parseUnit('1 / s').toString()).toBe('1 / s');
        expect(unit({ s: fr(-1) }, 'k').toString()).toBe('k / s');
    });

    test('with factor', () => {
        expect(
            unit({ A: fr(1) }, { mul: 24, base: 10, exp: 0 }).toString(),
        ).toBe('24 A');

        expect(
            unit({ A: fr(1) }, { mul: 3, base: 24, exp: 1 }).toString(),
        ).toBe('3 * 24 A');

        expect(
            unit({ A: fr(1) }, { mul: 24, base: 3, exp: 5 }).toString(),
        ).toBe('24 * 3^5 A');

        expect(
            unit({ A: fr(1) }, { mul: 1, base: 10, exp: 6 }).toString(),
        ).toBe('MA');
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
        const u = unit({ s: fr(1) }, { base: 10, exp: 0, mul: 1 });

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
        const u = unit({ s: fr(1) }, { base: 10, exp: 3, mul: 1 });

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
