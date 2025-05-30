import { Fraction } from 'fraction.js';
import { Quantity } from './Quantity';
import { isQuantity } from './types';
import { SI } from './systems';
import { describe, test, expect } from 'bun:test';

describe('Quantity', () => {
    describe('constructor', () => {
        test('should create a new Quantity instance', () => {
            const q = new Quantity(42, SI.parseUnit('kg'));
            expect(q).toBeInstanceOf(Quantity);
            expect(q.value).toBe(42);
            expect(q.unit).toEqual(SI.parseUnit('kg'));
        });

        test('should freeze the new instance', () => {
            const q = new Quantity(42, SI.parseUnit('kg'));
            expect(Object.isFrozen(q)).toBe(true);
        });
    });

    test('isQuantity', () => {
        expect(isQuantity(4)).toBeFalse();
        expect(isQuantity({})).toBeFalse();
        expect(isQuantity([])).toBeFalse();
        expect(isQuantity(SI.parseUnit('km'))).toBeFalse();

        expect(isQuantity(new Quantity(42, SI.parseUnit('kg')))).toBeTrue();
        expect(isQuantity(new Quantity(500, SI.parseUnit('ms')))).toBeTrue();
        expect(isQuantity(new Quantity(1764, SI.parseUnit('m^2')))).toBeTrue();
    });

    describe('negative', () => {
        test('should return the additive inverse of the quantity', () => {
            const q = new Quantity(500, SI.parseUnit('ms'));
            const neg = q.negative();
            expect(neg).toEqual(new Quantity(-500, SI.parseUnit('ms')));
        });
    });

    describe('inverse', () => {
        test('should return the multiplicative inverse of the quantity', () => {
            const q = new Quantity(42, SI.parseUnit('m').inverse());
            const inv = q.inverse();
            expect(inv).toEqual(new Quantity(1 / 42, SI.parseUnit('m')));
        });
    });

    describe('isEqual', () => {
        test('should return true if the quantities are equal', () => {
            const q1 = new Quantity(42, SI.parseUnit('kg'));
            const q2 = new Quantity(42, SI.parseUnit('kg'));
            expect(q1.isEqual(q2)).toBe(true);
        });

        test('should return false if the quantities are not equal', () => {
            const q1 = new Quantity(42, SI.parseUnit('kg'));
            const q2 = new Quantity(43, SI.parseUnit('kg'));
            expect(q1.isEqual(q2)).toBe(false);
        });

        test('should compare the units as well as the values', () => {
            const q1 = new Quantity(42, SI.parseUnit('m'));
            const q2 = new Quantity(42, SI.parseUnit('kg'));
            expect(q1.isEqual(q2)).toBe(false);
        });
    });

    describe('isApproxEqual', () => {
        test('should return true if the quantities are approximately equal', () => {
            const q1 = new Quantity(42, SI.parseUnit('kg'));
            const q2 = new Quantity(42.0001, SI.parseUnit('kg'));
            expect(q1.isApproxEqual(q2, { rel: 0.001 })).toBe(true);
        });

        test('should return false if the quantities are not approximately equal', () => {
            const q1 = new Quantity(42, SI.parseUnit('kg'));
            const q2 = new Quantity(43, SI.parseUnit('kg'));
            expect(q1.isApproxEqual(q2, { rel: 0.001 })).toBe(false);
        });

        test('should compare the units as well as the values', () => {
            const q1 = new Quantity(42, SI.parseUnit('m'));
            const q2 = new Quantity(42, SI.parseUnit('kg'));
            expect(q1.isApproxEqual(q2, { rel: 0.001 })).toBe(false);
        });
    });

    describe('pow', () => {
        test('should return the quantity raised to the given power', () => {
            const q = new Quantity(42, SI.parseUnit('m'));
            const q2 = q.pow(new Fraction(2));
            expect(q2).toEqual(new Quantity(1764, SI.parseUnit('m^2')));
        });
    });

    describe('multiply', () => {
        test('should scale a quantity by a scalar', () => {
            const q = new Quantity(5, SI.parseUnit('m'));
            const p = q.multiply(3);
            expect(p).toEqual(new Quantity(15, SI.parseUnit('m')));
        });

        test('should return the product of two quantities', () => {
            const q1 = new Quantity(2, SI.parseUnit('m'));
            const q2 = new Quantity(3, SI.parseUnit('s'));
            const q3 = q1.multiply(q2);
            expect(q3).toEqual(new Quantity(6, SI.parseUnit('m s')));
        });
    });

    describe('divide', () => {
        test('should return the quotient of two quantities', () => {
            const q1 = new Quantity(6, SI.parseUnit('m s'));
            const q2 = new Quantity(3, SI.parseUnit('s'));
            const q3 = q1.divide(q2);
            expect(q3.isEqual(new Quantity(2, SI.parseUnit('m')))).toBe(true);
        });
    });

    describe('inUnits', () => {
        test('should convert the quantity to the given units', () => {
            const q1 = new Quantity(42, SI.parseUnit('m'));
            const q2 = q1.inUnits(SI.parseUnit('cm'));
            expect(q2).toEqual(new Quantity(4200, SI.parseUnit('cm')));
        });

        test('should throw an error if the units are incompatible', () => {
            const q1 = new Quantity(42, SI.parseUnit('m'));
            expect(() => q1.inUnits(SI.parseUnit('s'))).toThrow();
        });
    });

    describe('add', () => {
        test('should return the sum of two quantities with compatible units', () => {
            const q1 = new Quantity(2, SI.parseUnit('m'));
            const q2 = new Quantity(3, SI.parseUnit('m'));
            const q3 = q1.add(q2);
            expect(q3).toEqual(new Quantity(5, SI.parseUnit('m')));
        });

        test('should throw an error if the units are incompatible', () => {
            const q1 = new Quantity(2, SI.parseUnit('m'));
            const q2 = new Quantity(3, SI.parseUnit('s'));
            expect(() => q1.add(q2)).toThrow();
        });
    });

    describe('subtract', () => {
        test('should return the difference of two quantities with compatible units', () => {
            const q1 = new Quantity(5, SI.parseUnit('m'));
            const q2 = new Quantity(3, SI.parseUnit('m'));
            const q3 = q1.subtract(q2);
            expect(q3).toEqual(new Quantity(2, SI.parseUnit('m')));
        });

        test('should throw an error if the units are incompatible', () => {
            const q1 = new Quantity(2, SI.parseUnit('m'));
            const q2 = new Quantity(3, SI.parseUnit('s'));
            expect(() => q1.subtract(q2)).toThrow();
        });
    });

    describe('toString', () => {
        test('should return a string representation of the quantity', () => {
            let q = new Quantity(42, SI.parseUnit('m'));
            expect(q.toString()).toBe('42 m');

            q = new Quantity(3, SI.parseUnit('km'));
            expect(q.toString()).toBe('3 km');
        });
        test('should not omit unity for quantities', () => {
            const q = new Quantity(1, SI.parseUnit('km'));
            expect(q.toString()).toBe('1 km');
        });
        test('should properly take decimal places into account', () => {
            let q = new Quantity(1.88, SI.parseUnit('m'));
            expect(q.toString({ decimalPlaces: 1 })).toBe('1.9 m');
            q = new Quantity(1.8, SI.parseUnit('m'));
            expect(q.toString({ decimalPlaces: 0 })).toBe('2 m');

            q = new Quantity(2.1, SI.parseUnit('m'));
            expect(q.toString({ decimalPlaces: 0 })).toBe('2 m');
            q = new Quantity(2.11, SI.parseUnit('m'));
            expect(q.toString({ decimalPlaces: 1 })).toBe('2.1 m');

            q = new Quantity(25, SI.parseUnit('m'));
            expect(q.toString({ decimalPlaces: 0 })).toBe('25 m');
            expect(q.toString({ decimalPlaces: 1 })).toBe('25.0 m');
        });
    });
});
