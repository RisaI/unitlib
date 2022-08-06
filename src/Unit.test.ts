import Fraction from 'fraction.js';
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

describe('unit parsing', () => {
    test('singular unit', () => {
        const testVals: [string, Unit<U, F, D>][] = [
            ['K', unitSystem.createUnit({ K: new Fraction(1) })],
            [
                'g s',
                unitSystem.createUnit({
                    g: new Fraction(1),
                    s: new Fraction(1),
                }),
            ],
            [
                'm / s',
                unitSystem.createUnit({
                    m: new Fraction(1),
                    s: new Fraction(-1),
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
