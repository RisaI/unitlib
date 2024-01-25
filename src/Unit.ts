import Fraction from 'fraction.js';

import { UnitSystem } from './UnitSystem.ts';

import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
} from './types.ts';
import { normalizeFactor, toUnicodeSuperscript } from './utils.ts';
import {
    ApproximateEqualityThreshold,
    areApproximatelyEqual,
} from './float.ts';

export const UnityFactor: FactorDefinition = { mul: 1, base: 10, exp: 0 };
Object.freeze(UnityFactor);

export interface FormatOptions {
    compact?: boolean;
    forceExponential?: boolean;
    fancyUnicode?: boolean;
    useNegativeExponents?: boolean;
}

export class Unit<
    U extends Record<string, BaseUnitDefinition>,
    F extends Record<string, FactorDefinition>,
    D extends Record<string, DerivedUnitDefinition>,
> {
    constructor(
        public readonly unitSystem: UnitSystem<U, F, D>,
        public readonly factor: FactorDefinition,
        public readonly baseUnits: Partial<Record<keyof U, Fraction>>,
    ) {
        Object.freeze(this);
    }

    // From specific unit
    public exponentOf(baseUnit: keyof U): Fraction {
        return this.baseUnits[baseUnit] ?? new Fraction(0);
    }

    public get isUnitless(): boolean {
        return !Object.values(this.baseUnits).some(
            (v) => v !== undefined && v.valueOf() !== 0,
        );
    }

    public inverse(): Unit<U, F, D> {
        const factor = { ...this.factor };

        factor.exp = -factor.exp;
        factor.mul = 1 / factor.mul;

        return new Unit(
            this.unitSystem,
            factor,
            Object.fromEntries(
                Object.entries(this.baseUnits).map(([k, v]) => [k, v?.neg()]),
            ) as Record<keyof U, Fraction>,
        );
    }

    public isEqual(rhs: Unit<U, F, D>): boolean {
        // Check unit exponents
        if (
            Object.keys(this.unitSystem.baseUnits).some(
                (u) => !this.exponentOf(u).equals(rhs.exponentOf(u)),
            )
        ) {
            return false;
        }

        // Check factors
        if (this.factor.mul !== rhs.factor.mul) return false;
        if (this.factor.exp !== rhs.factor.exp) return false;
        if (this.factor.exp === 0) return true;
        return this.factor.base === rhs.factor.base;
    }

    public isApproxEqual(
        rhs: Unit<U, F, D>,
        thresholds: ApproximateEqualityThreshold = {},
    ): boolean {
        // Check unit exponents
        if (
            Object.keys(this.unitSystem.baseUnits).some(
                (u) => !this.exponentOf(u).equals(rhs.exponentOf(u)),
            )
        ) {
            return false;
        }

        // Check factors
        return areApproximatelyEqual(
            this.factor.mul * this.factor.base ** this.factor.exp,
            rhs.factor.mul * rhs.factor.base ** rhs.factor.exp,
            thresholds,
        );
    }

    /** Compatible units are such that can be added together, i.e. 1 kg + 1 g */
    public isCompatible(rhs: Unit<any, any, any>): boolean {
        //TODO add support for 1 m + 1 inch, i.e. different unit systems

        const sameBase = !Object.keys(this.unitSystem.baseUnits).some(
            (u) => !this.exponentOf(u).equals(rhs.exponentOf(u)),
        );
        return this.unitSystem === rhs.unitSystem && sameBase;
    }

    public pow(num: Fraction): Unit<U, F, D> {
        const factor = { ...this.factor };

        if (factor.exp !== 0) {
            const next = factor.exp * num.valueOf();
            const rem = next - Math.floor(next);

            factor.exp = Math.floor(next);
            factor.mul *= Math.pow(factor.base, rem);
        }

        return new Unit(
            this.unitSystem,
            factor,
            Object.fromEntries(
                Object.entries(this.baseUnits).map(([k, v]) => [
                    k,
                    v?.mul(num),
                ]),
            ) as Partial<Record<keyof U, Fraction>>,
        );
    }

    public multiply(rhs: Unit<U, F, D> | number): Unit<U, F, D> {
        if (typeof rhs === 'number') {
            return this.withFactor({
                mul: rhs * this.factor.mul,
            });
        }

        const baseUnits: Partial<Record<keyof U, Fraction>> = {
            ...this.baseUnits,
        };

        // Known
        Object.entries(rhs.baseUnits).forEach(([unit, exp]) => {
            if (unit in baseUnits && exp !== undefined) {
                baseUnits[unit as keyof U] = baseUnits[unit]?.add(exp);
            } else {
                baseUnits[unit as keyof U] = exp;
            }
        });

        // Common factor
        let lhsFactor = this.factor;
        let rhsFactor = rhs.factor;

        let factor = { ...UnityFactor, mul: lhsFactor.mul * rhsFactor.mul };

        if (rhsFactor.exp === 0) {
            rhsFactor = { ...rhsFactor, base: lhsFactor.base };
        } else if (lhsFactor.exp === 0) {
            lhsFactor = { ...lhsFactor, base: rhsFactor.base };
        }

        if (lhsFactor.base === rhsFactor.base) {
            factor.base = lhsFactor.base;
            factor.exp = lhsFactor.exp + rhsFactor.exp;
        } else {
            const [major, minor] =
                lhsFactor.base < rhsFactor.base
                    ? [rhsFactor, lhsFactor]
                    : [lhsFactor, rhsFactor];

            factor.base = major.base;
            factor.exp = major.exp;
            // TODO: this will lead to numerical inaccuracy
            // TODO: perhaps attempt to put most of the value into the exp first
            // TODO: something like exp += Math.floor(minor.exp * Math.log(minor.base) / Math.log(major.base))
            factor.mul *= Math.pow(minor.base, minor.exp);
        }

        return new Unit(this.unitSystem, normalizeFactor(factor), baseUnits);
    }

    public divide(rhs: Unit<U, F, D>): Unit<U, F, D> {
        return this.multiply(rhs.inverse());
    }

    public withFactor(factor: Partial<FactorDefinition>): Unit<U, F, D> {
        return new Unit(
            this.unitSystem,
            { ...this.factor, ...factor },
            { ...this.baseUnits },
        );
    }

    public withBestFactorFor(value: number): Unit<U, F, D> {
        if (Number.isNaN(value) || !Number.isFinite(value)) return this;
        if (value === 0)
            return new Unit(this.unitSystem, UnityFactor, {
                ...this.baseUnits,
            });

        let result:
            | { prevDist: Fraction; factor: Unit<U, F, D>['factor'] }
            | undefined;

        [...Object.values(this.unitSystem.factors), UnityFactor].forEach(
            ({ base, exp, mul }) => {
                const expInBase = new Fraction(
                    Math.floor(
                        (Math.log(Math.abs(value) * (this.factor.mul / mul)) +
                            this.factor.exp * Math.log(this.factor.base)) /
                            Math.log(base),
                    ),
                    1,
                );
                const dist = expInBase.sub(exp);

                if (
                    dist.valueOf() >= 0 &&
                    (!result || dist.valueOf() < result.prevDist.valueOf())
                ) {
                    result = {
                        prevDist: dist,
                        factor: { base, exp, mul },
                    };
                }
            },
        );

        return new Unit(this.unitSystem, result?.factor ?? UnityFactor, {
            ...this.baseUnits,
        });
    }

    /**
     * Takes a dimensionless value and multiplies it by this unit's factor.
     * Assuming the value is expressed in this unit, the method converts it
     * to the base unit.
     * @example
     * const unit = SI.parseUnit('km');
     * unit.multiplyValueByFactor(2) // 2_000
     * // because 2 km = 2 000 m
     */
    public multiplyValueByFactor(value: number): number {
        const { mul, base, exp } = this.factor;
        if (exp.valueOf() === 0 && mul === 1) return value;

        // !TODO compare precision
        return value * mul * base ** exp;
        // return Math.exp(Math.log(mul * value) + exp * Math.log(base));
    }

    /**
     * Takes a dimensionless value and divides it by this unit's factor.
     * Assuming the value is expressed in the base unit, the method converts
     * it to this unit.
     * @example
     * const unit = SI.parseUnit('km');
     * unit.divideValueByFactor(2_000) // 2
     * // because 2 000 m = 2 km
     */
    public divideValueByFactor(value: number): number {
        const { mul, base, exp } = this.factor;
        if (exp.valueOf() === 0 && mul === 1) return value;

        // !TODO compare precision
        return value / (mul * base ** exp);
        // return Math.exp(Math.log(value / mul) - exp * Math.log(base));
    }

    public toString(opts: FormatOptions = {}): string {
        if (this.isUnitless) {
            const { mul, exp, base } = this.factor;
            const parts: string[] = [];

            if (mul !== 1) parts.push(`${mul}`);
            if (exp.valueOf() !== 0) parts.push(`${base}^${exp}`);
            if (parts.length === 0) parts.push('1');

            return parts.join(' * ');
        }

        let prefix = '';
        let numerator: string[] = [];
        let denominator: string[] = [];

        // Edge case: if there are no units with a positive exponent, take
        // steps to avoid 1000s⁻¹ turning into k/s or ks⁻¹

        const isInverseUnit = Object.values(this.baseUnits).every(
            (exp) => !exp || exp.compare(0) <= 0,
        );
        const inv = isInverseUnit ? this.inverse() : undefined;

        const inverseFactorAbbrev = inv
            ? this.unitSystem.getFactorSymbol(inv.factor)
            : undefined;

        if (inv && inverseFactorAbbrev && !opts.useNegativeExponents) {
            return (opts.compact ? '1/' : '1 / ') + inv.toString(opts);
        }

        const normalFactorAbbrev = this.unitSystem.getFactorSymbol(this.factor);

        // Factor prefix formatting
        const factorAbbrev = inv ? inverseFactorAbbrev : normalFactorAbbrev;

        if (!factorAbbrev || opts.forceExponential) {
            const { mul, exp, base } = this.factor;

            if (mul !== 1) {
                prefix += `${mul} * `;
            }

            if (exp.valueOf() === 1) {
                prefix += `${String(base)} `;
            } else if (exp.valueOf() !== 0) {
                prefix += `${base}^${exp} `;
            } else if (mul !== 1) {
                prefix = prefix.slice(0, -2); // remove '*'
            }
        } else {
            prefix = String(factorAbbrev);
        }

        // Unit rows formatting
        for (const baseUnit in this.baseUnits) {
            const exp = this.baseUnits[baseUnit];
            if (exp === undefined) continue;

            function expString(exp: Fraction): string {
                return opts.fancyUnicode
                    ? toUnicodeSuperscript(exp.toFraction())
                    : '^' + exp.toFraction();
            }

            switch (exp.valueOf()) {
                case 0:
                    continue;
                case 1:
                    numerator.push(baseUnit);
                    continue;
                case -1:
                    if (!opts.useNegativeExponents) {
                        denominator.push(baseUnit);
                        continue;
                    }
            }

            if (opts.useNegativeExponents) {
                numerator.push(baseUnit + expString(exp));
            } else {
                (exp.valueOf() > 0 ? numerator : denominator).push(
                    baseUnit + expString(exp.abs()),
                );
            }
        }

        // Combine numerator and denominator
        const div = opts.compact ? '/' : ' / ';

        // If no multiplier and numerator unit but a nonzero
        if (numerator.length === 0 && prefix.length === 0) numerator.push('1');

        const dedupeSpaces = (s: string) => s.replace(/\s\s+/g, ' ');

        let n = numerator.join(' ');
        switch (denominator.length) {
            case 0:
                return `${prefix}${n}`;
            case 1:
                return dedupeSpaces(`${prefix}${n}${div}${denominator[0]}`);
            default:
                return dedupeSpaces(
                    `${prefix}${n}${div}(${denominator.join(' ')})`,
                );
        }
    }
}
