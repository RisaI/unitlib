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
});

describe('unit parsing', () => {
    test('singular unit', () => {
        const testVals: [string, Unit<U, F, D>][] = [
            ['K', unitSystem.createUnit({ K: new Fr(1) })],
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
        ];

        for (const [toParse, unit] of testVals) {
            const parsed = unitSystem.parseUnit(toParse);
            console.log(parsed);
            expect(parsed.isEqual(unit)).toBeTruthy();
        }
    });
});
