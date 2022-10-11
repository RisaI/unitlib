import Fr from 'fraction.js';
import {
    BinaryFactors,
    CompsciBaseUnits,
    SIBaseUnits,
    SIFactors,
} from './definitions';
import { Unit } from './Unit';
import { UnitSystem } from './UnitSystem';

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

beforeAll(() => {
    unitSystem = new UnitSystem(baseUnits, factors, {});
});

describe('unit ops', () => {
    test('exponentOf', () => {
        const u = unitSystem.createUnit({
            m: new Fr(1),
            s: new Fr(3),
            A: new Fr(-4),
            cd: new Fr(420),
        });

        expect(u.exponentOf('mol').valueOf()).toBe(0);
        expect(u.exponentOf('g').valueOf()).toBe(0);
        expect(u.exponentOf('cd').valueOf()).toBe(420);
        expect(u.exponentOf('A').valueOf()).toBe(-4);
        expect(u.exponentOf('s').valueOf()).toBe(3);
        expect(u.exponentOf('m').valueOf()).toBe(1);
    });

    test('neg', () => {
        const u = unitSystem.createUnit({
            mol: new Fr(2),
            s: new Fr(-4),
            g: new Fr(1),
        });
        const v = unitSystem.createUnit({
            mol: new Fr(-2),
            s: new Fr(4),
            g: new Fr(-1),
        });

        expect(u.inverse().isEqual(v)).toBe(true);
    });

    test('pow', () => {
        const u = unitSystem.createUnit({
            mol: new Fr(2),
            s: new Fr(-4),
            g: new Fr(1),
        });
        const v = unitSystem.createUnit({
            mol: new Fr(-3, 2),
            s: new Fr(3),
            g: new Fr(-3, 4),
        });
        const w = u.pow(new Fr(-3, 4));

        expect(w.exponentOf('mol').valueOf()).toBe(
            v.exponentOf('mol').valueOf(),
        );
        expect(w.exponentOf('s').valueOf()).toBe(v.exponentOf('s').valueOf());
        expect(w.exponentOf('g').valueOf()).toBe(v.exponentOf('g').valueOf());
        expect(w.exponentOf('A').valueOf()).toBe(v.exponentOf('A').valueOf());
        expect(w.isEqual(v)).toBe(true);
    });

    test('multiply', () => {
        // TODO:
    });
});

describe('unit parsing', () => {
    test('unity', () => {
        const a = unitSystem.createUnit({});
        const b = unitSystem.parseUnit('');
        const c = unitSystem.parseUnit('1');

        expect(a.isEqual(b)).toBe(true);
        expect(b.isEqual(c)).toBe(true);
        expect(a.isEqual(c)).toBe(true);
    });

    test('from text', () => {
        const testVals: [string, Unit<U, F, D>][] = [
            ['K', unitSystem.createUnit({ K: new Fr(1) })],
            ['m', unitSystem.createUnit({ m: new Fr(1) })],
            // with a known factor
            [
                'kK',
                unitSystem.createUnit(
                    { K: new Fr(1) },
                    { base: 10, exp: 3, mul: 1 },
                ),
            ],
            // with reduntant space
            [
                'k K',
                unitSystem.createUnit(
                    { K: new Fr(1) },
                    { base: 10, exp: 3, mul: 1 },
                ),
            ],
            [
                'g s',
                unitSystem.createUnit({
                    g: new Fr(1),
                    s: new Fr(1),
                }),
            ],
            [
                'm / s',
                unitSystem.createUnit({
                    m: new Fr(1),
                    s: new Fr(-1),
                }),
            ],
            [
                's^-2 m^-3',
                unitSystem.createUnit({
                    m: new Fr(-3),
                    s: new Fr(-2),
                }),
            ],
            [
                'm^3 / (kg s^2)',
                unitSystem.createUnit(
                    {
                        m: new Fr(3),
                        s: new Fr(-2),
                        g: new Fr(-1),
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
    test('denom', () => {
        expect(unitSystem.createUnit({ s: new Fr(-1) }).toString()).toEqual(
            '1 / s',
        );
        expect(unitSystem.parseUnit('1 / s').toString()).toEqual('1 / s');
        expect(
            unitSystem.createUnit({ s: new Fr(-1) }, 'k').toString(),
        ).toEqual('k / s');
    });
});

describe('factor inference', () => {
    test('withBestFactor', () => {
        const unit = unitSystem.createUnit(
            { s: new Fr(1) },
            { base: 10, exp: 3, mul: 1 },
        );

        const test = [
            [10_000, 'ks'],
            [6_900_000, 'Ms'],
            [0.5e-2, 'ms'],
            [2e-7, 'ns'],
            [12, 'das'],
            [7, 's'],
        ] as const;

        for (const [val, expected] of test) {
            expect(unit.withBestFactorFor(val).toString()).toEqual(expected);
        }
    });
});
