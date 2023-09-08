import type Fraction from 'fraction.js';
import type { FormatOptions, Unit } from './Unit';
import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
} from './types';
import { ApproximateEqualityThreshold } from './float';

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

    public isEqual(rhs: Quantity<U, F, D>): boolean {
        if (this.value !== rhs.value) return false;
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

    public multiply(rhs: Quantity<U, F, D>): Quantity<U, F, D> {
        return new Quantity(
            this.value * rhs.value,
            this.unit.multiply(rhs.unit),
        );
    }

    public divide(rhs: Quantity<U, F, D>): Quantity<U, F, D> {
        return this.multiply(rhs.inverse());
    }

    public toString(opts: FormatOptions = {}) {
        return this.unit.multiply(this.value).toString();
    }
}
