import { absDistance, formatFloat, relDistance, ulpDistance } from './float';
import { describe, test, expect } from 'bun:test';

const values = [
    0,
    1,
    1 + Number.EPSILON,
    1 - Number.EPSILON,
    -2.0357544944603468e228,
    -2.476071836022912e-116,
    5.2721852488424196e137,
    6.48978778417756e-197,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Infinity,
    -Infinity,
];

function testCommonProperties(distFn: (a: number, b: number) => number) {
    // NaN handling
    for (const x of values) {
        expect(distFn(x, NaN)).toBe(Infinity);
    }
    expect(distFn(NaN, NaN)).toBe(Infinity);

    // zero handling
    expect(distFn(+0, -0)).toBe(0);
    expect(distFn(-0, +0)).toBe(0);

    // reflexivity
    for (const x of values) {
        expect(distFn(x, x)).toBe(0);
    }

    // positivity and symmetry
    for (const x of values) {
        for (const y of values) {
            expect(distFn(x, y)).toBeGreaterThanOrEqual(0);
            if (x !== y) expect(distFn(x, y)).toBeGreaterThan(0);
            expect(distFn(x, y)).toBe(distFn(y, x));
        }
    }

    // symmetry around zero
    for (const x of values) {
        expect(distFn(0, x)).toBe(distFn(0, -x));
    }
}

describe('float approx equals', () => {
    test('abs distance', () => {
        testCommonProperties(absDistance);

        expect(absDistance(1, 1 + Number.EPSILON)).toBe(Number.EPSILON);
        expect(absDistance(1, 1 - Number.EPSILON)).toBe(Number.EPSILON);

        expect(absDistance(1e20, 2e20)).toBe(1e20);
        expect(absDistance(100, 200)).toBe(100);
        expect(absDistance(0.001, 0.002)).toBe(0.001);

        for (const x of values) {
            expect(absDistance(-x, x)).toBe(2 * absDistance(0, x));
        }
    });

    test('rel distance', () => {
        testCommonProperties(relDistance);

        expect(relDistance(1e20, 2e20)).toBe(1);
        expect(relDistance(100, 200)).toBe(1);
        expect(relDistance(0.001, 0.002)).toBe(1);
    });

    test('ulp distance', () => {
        testCommonProperties(ulpDistance);

        expect(ulpDistance(1, 1 + Number.EPSILON)).toBe(1);
        expect(ulpDistance(1, 1 + 5 * Number.EPSILON)).toBe(5);
        expect(ulpDistance(1, 1 - Number.EPSILON)).toBe(2);

        expect(ulpDistance(Number.MAX_VALUE, Infinity)).toBe(1);
        expect(ulpDistance(-Number.MAX_VALUE, -Infinity)).toBe(1);
        expect(ulpDistance(Number.MIN_VALUE, 0)).toBe(1);
        expect(ulpDistance(-Number.MIN_VALUE, 0)).toBe(1);
        expect(ulpDistance(Number.MIN_VALUE, -Number.MIN_VALUE)).toBe(2);

        for (const x of values) {
            expect(ulpDistance(-x, x)).toBe(2 * ulpDistance(0, x));
        }
    });
});

describe('float formatting', () => {
    test('doesnt round 0.95 up to 0.10', () => {
        expect(formatFloat(0.95, { decimalPlaces: 2 })).toBe('0.95');
        expect(formatFloat(0.95, { decimalPlaces: 1 })).toBe('1.0');
        expect(formatFloat(0.95, { decimalPlaces: 0 })).toBe('1');
    });
});
