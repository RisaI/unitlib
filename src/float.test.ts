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

    test('chooses correct minus sign', () => {
        expect(formatFloat(-1, { fancyUnicode: false })).toBe('-1');
        expect(formatFloat(-1, { fancyUnicode: true })).toBe('−1');
    });
    test('formats numbers with different decimal places', () => {
        expect(formatFloat(1234.5678, { decimalPlaces: 2 })).toBe('1234.57');
        expect(formatFloat(1234.5678, { decimalPlaces: 1 })).toBe('1234.6');
        expect(formatFloat(1234.5678, { decimalPlaces: 0 })).toBe('1235');
    });

    test('handles rounding strategies', () => {
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                roundingStrategy: 'up',
            }),
        ).toBe('1234.57');
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                roundingStrategy: 'down',
            }),
        ).toBe('1234.56');
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                roundingStrategy: 'half-up',
            }),
        ).toBe('1234.57');
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                roundingStrategy: 'half-down',
            }),
        ).toBe('1234.57');
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                roundingStrategy: 'half-to-even',
            }),
        ).toBe('1234.57');
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                roundingStrategy: 'half-to-odd',
            }),
        ).toBe('1234.57');
    });

    test('handles fancyUnicode option', () => {
        expect(
            formatFloat(-1234.5678, { decimalPlaces: 2, fancyUnicode: false }),
        ).toBe('-1234.57');
        expect(
            formatFloat(-1234.5678, { decimalPlaces: 2, fancyUnicode: true }),
        ).toBe('−1234.57');
    });

    test('handles digit grouping', () => {
        expect(
            formatFloat(1234567.89, {
                decimalPlaces: 2,
                digitGroupLength: 3,
                digitGroupSeparator: ',',
            }),
        ).toBe('1,234,567.89');
        expect(
            formatFloat(1234567.89, {
                decimalPlaces: 2,
                digitGroupLength: 2,
                digitGroupSeparator: ' ',
            }),
        ).toBe('1 23 45 67.89');
    });

    test('handles fractional part separator', () => {
        expect(
            formatFloat(1234.5678, {
                decimalPlaces: 2,
                fractionalPartSeparator: ',',
            }),
        ).toBe('1234,57');
    });

    test('handles negative numbers', () => {
        expect(formatFloat(-1234.5678, { decimalPlaces: 2 })).toBe('-1234.57');
        expect(formatFloat(-1234.5678, { decimalPlaces: 1 })).toBe('-1234.6');
        expect(formatFloat(-1234.5678, { decimalPlaces: 0 })).toBe('-1235');
    });

    test('handles zero', () => {
        expect(formatFloat(0, { decimalPlaces: 2 })).toBe('0.00');
        expect(formatFloat(0, { decimalPlaces: 0 })).toBe('0');
    });

    test('handles large numbers', () => {
        expect(formatFloat(1e20, { decimalPlaces: 2 })).toBe(
            '100000000000000000000.00',
        );
        expect(formatFloat(-1e20, { decimalPlaces: 2 })).toBe(
            '-100000000000000000000.00',
        );
    });

    test('handles small numbers', () => {
        expect(formatFloat(1e-20, { decimalPlaces: 22 })).toBe(
            '0.0000000000000000000100',
        );
        expect(formatFloat(-1e-20, { decimalPlaces: 22 })).toBe(
            '-0.0000000000000000000100',
        );
        expect(formatFloat(1e-20, { decimalPlaces: 19 })).toBe(
            '0.0000000000000000000',
        );
        expect(formatFloat(-1e-20, { decimalPlaces: 19 })).toBe(
            '0.0000000000000000000',
        );
        expect(
            formatFloat(-1e-20, { decimalPlaces: 19, allowNegativeZero: true }),
        ).toBe('-0.0000000000000000000');
    });
});
