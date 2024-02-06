import type Fraction from 'fraction.js';
import type { Unit } from './Unit.ts';
import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
    QuantityFormatOptions,
} from './types';
import { ApproximateEqualityThreshold } from './float.ts';

export class Quantity<
    U extends Record<string, BaseUnitDefinition>,
    F extends Record<string, FactorDefinition>,
    D extends Record<string, DerivedUnitDefinition>,
> {
    constructor(
        public readonly value: number,
        public readonly unit: Unit<U, F, D>,
    ) {
        Object.freeze(this);
    }

    public get isUnitless(): boolean {
        return this.unit.isUnitless;
    }

    public inverse(): Quantity<U, F, D> {
        return new Quantity(1 / this.value, this.unit.inverse());
    }

    public negative(): Quantity<U, F, D> {
        return new Quantity(-this.value, this.unit);
    }

    public isEqual(rhs: Quantity<U, F, D>): boolean {
        if (!this.unit.isCompatible(rhs.unit)) return false;
        if (this.value !== rhs.inUnits(this.unit).value) return false;
        return this.unit.isEqual(rhs.unit);
    }

    public isApproxEqual(
        rhs: Quantity<U, F, D>,
        thresholds: ApproximateEqualityThreshold = {},
    ): boolean {
        return this.unit
            .multiply(this.value)
            .isApproxEqual(rhs.unit.multiply(rhs.value), thresholds);
    }

    public pow(num: Fraction): Quantity<U, F, D> {
        return new Quantity(this.value ** num.valueOf(), this.unit.pow(num));
    }

    public multiply(rhs: Quantity<U, F, D> | number): Quantity<U, F, D> {
        if (typeof rhs === 'number') {
            return new Quantity(this.value * rhs, this.unit);
        }
        return new Quantity(
            this.value * rhs.value,
            this.unit.multiply(rhs.unit),
        );
    }

    public divide(rhs: Quantity<U, F, D>): Quantity<U, F, D> {
        return this.multiply(rhs.inverse());
    }

    /** Returns a new object that corresponds to this quantity in different units
     * @example
     * const q = new Quantity(42, SI.parseUnit('kg'));
     * const q2 = q.inUnits(SI.parseUnit('g'));
     * console.log(q2.value); // 42000
     */
    public inUnits(targetUnit: Unit<U, F, D>): Quantity<U, F, D> {
        if (!this.unit.isCompatible(targetUnit)) {
            throw new Error(
                `Cannot convert incompatible units ${this.unit.toString()} and ${targetUnit.toString()}`,
            );
        }
        const valueInBase = this.unit.multiplyValueByFactor(this.value);
        const valueInTarget = targetUnit.divideValueByFactor(valueInBase);
        return new Quantity(valueInTarget, targetUnit);
    }

    public add(rhs: Quantity<U, F, D>): Quantity<U, F, D> {
        if (!this.unit.isCompatible(rhs.unit)) {
            throw new Error(
                "Cannot add quantities that don't have compatible units",
            );
        }
        const rhsInThis = rhs.inUnits(this.unit).value;
        return new Quantity(this.value + rhsInThis, this.unit);
    }

    /** Returns equivalent of this - rhs */
    public subtract(rhs: Quantity<U, F, D>): Quantity<U, F, D> {
        if (!this.unit.isCompatible(rhs.unit)) {
            throw new Error(
                "Cannot substract quantities that don't have compatible units",
            );
        }
        const rhsInThis = rhs.inUnits(this.unit).value;
        return new Quantity(this.value - rhsInThis, this.unit);
    }

    /** returns equivalent of this > rhs */
    public greaterThan(rhs: Quantity<U, F, D>): boolean {
        if (!this.unit.isCompatible(rhs.unit)) {
            throw new Error(
                "Cannot compare quantities that don't have compatible units",
            );
        }
        const rhsInThis = rhs.inUnits(this.unit).value;
        return this.value > rhsInThis;
    }

    /** returns equivalent of this < rhs */
    public lessThan(rhs: Quantity<U, F, D>): boolean {
        if (!this.unit.isCompatible(rhs.unit)) {
            throw new Error(
                "Cannot compare quantities that don't have compatible units",
            );
        }
        const rhsInThis = rhs.inUnits(this.unit).value;
        return this.value < rhsInThis;
    }

    public toString(opts: QuantityFormatOptions = {}) {
        return this.unit.multiply(this.value).toString(opts);
    }
}
