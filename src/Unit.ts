import Fraction from 'fraction.js';

import { UnitSystem } from './UnitSystem';

import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
} from './types';
import { normalizeFactor, toUnicodeSuperscript } from './utils';

export class Unit<
    U extends Record<string, BaseUnitDefinition>,
    F extends Record<string, FactorDefinition>,
    D extends Record<string, DerivedUnitDefinition>,
> {
    constructor(
        public readonly unitSystem: UnitSystem<U, F, D>,
        public readonly factor: FactorDefinition = {
            mul: 1,
            base: 10,
            exp: 0,
        },
        public readonly baseUnits: Partial<Record<keyof U, Fraction>>,
    ) {
        Object.freeze(this);
    }

    // From specific unit
    public exponentOf(baseUnit: keyof U): Fraction {
        return this.baseUnits[baseUnit] ?? new Fraction(0);
    }

    public get isUnitless(): boolean {
        return !Object.values(this.baseUnits).some((v) => v.valueOf() !== 0);
    }

    // Is this necessary when immutable?
    public clone(): Unit<U, F, D> {
        return new Unit(
            this.unitSystem,
            { ...this.factor },
            { ...this.baseUnits },
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
                Object.entries(this.baseUnits).map(([a, b]) => [a, b.neg()]),
            ) as Record<keyof U, Fraction>,
        );
    }

    public isEqual(rhs: Unit<U, F, D>): boolean {
        // Check unit exponents
        if (
            Object.keys(this.unitSystem.baseUnits).some(
                (u) => !this.exponentOf(u).equals(rhs.exponentOf(u)),
            )
        )
            return false;

        // Check factors
        return (
            this.factor.base === rhs.factor.base &&
            this.factor.exp === rhs.factor.exp &&
            this.factor.mul === rhs.factor.mul
        );
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
                Object.entries(this.baseUnits).map(([k, v]) => [k, v.mul(num)]),
            ) as Partial<Record<keyof U, Fraction>>,
        );
    }

    public multiply(rhs: Unit<U, F, D>): Unit<U, F, D> {
        const baseUnits: Partial<Record<keyof U, Fraction>> = {
            ...this.baseUnits,
        };

        // Known
        Object.entries(rhs.baseUnits).forEach(([unit, exp]) => {
            if (unit in baseUnits) {
                (baseUnits as Record<keyof U, Fraction>)[unit as keyof U] =
                    baseUnits[unit].add(exp);
            } else {
                baseUnits[unit as keyof U] = exp;
            }
        });

        // Common factor
        const lhsFactor = this.factor;
        const rhsFactor = rhs.factor;

        let factor = { mul: lhsFactor.mul * rhsFactor.mul, base: 10, exp: 0 };

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

    public withBestFactorFor(value: number): Unit<U, F, D> {
        if (Number.isNaN(value) || !Number.isFinite(value)) return this;
        if (value === 0)
            return new Unit(
                this.unitSystem,
                { mul: 1, base: 10, exp: 0 },
                { ...this.baseUnits },
            );

        let result:
            | { prevDist: Fraction; factor: Unit<U, F, D>['factor'] }
            | undefined;

        Object.values(this.unitSystem.factors).forEach(({ base, exp, mul }) => {
            const expInBase = new Fraction(
                Math.floor(Math.log(Math.abs(value / mul)) / Math.log(base)),
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
        });

        return new Unit(
            this.unitSystem,
            result?.factor ?? { mul: 1, base: 10, exp: 0 },
            {
                ...this.baseUnits,
            },
        );
    }

    public applyFactor(value: number): number {
        const { mul, base, exp } = this.factor;

        if (exp.valueOf() === 0 && mul === 1) return value;

        return Math.exp(Math.log(value / mul) - exp.valueOf() * Math.log(base));
    }

    public toString(
        opts: Partial<{
            compact: boolean;
            forceExponential: boolean;
            fancyUnicode: boolean;
            noDenom: boolean;
        }> = {},
    ): string {
        let prefix = '';
        let numerator: string[] = [];
        let denominator: string[] = [];

        // Factor prefix formatting
        const factorAbbrev = this.unitSystem.knownFactor(this.factor);

        if (!factorAbbrev || opts.forceExponential) {
            const { mul, exp, base } = this.factor;

            if (mul !== 1) {
                prefix += `${mul} * `;
            }

            if (exp.valueOf() === 1) {
                prefix += String(base);
            } else if (exp.valueOf() !== 0) {
                prefix += `${base}^${exp}`;
            } else if (mul !== 1) {
                prefix = prefix.slice(0, -2); // remove '*'
            }
        } else {
            prefix = String(factorAbbrev);
        }

        // Unit rows formatting
        for (const baseUnit in this.baseUnits) {
            const exp = this.baseUnits[baseUnit];

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
                    if (!opts.noDenom) {
                        denominator.push(baseUnit);
                        continue;
                    }
            }

            if (opts.noDenom) {
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

        let n = numerator.join(' ');
        switch (denominator.length) {
            case 0:
                return `${prefix}${n}`;
            case 1:
                return `${prefix}${n}${div}${denominator[0]}`;
            default:
                return `${prefix}${n}${div}(${denominator.join(' ')})`;
        }
    }
}
