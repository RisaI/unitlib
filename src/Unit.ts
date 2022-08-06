import Fraction from 'fraction.js';

import { UnitSystem } from './UnitSystem';

import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
} from './types';

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
    ) {}

    // From specific unit
    public exponentOf(baseUnit: keyof U): Fraction {
        return this.baseUnits[baseUnit] ?? new Fraction(0);
    }

    public get isUnitless(): boolean {
        return !Object.values(this.baseUnits).some((v) => v.valueOf() !== 0);
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
        // TODO:
        const result = this.multiply(rhs.inverse());
        const factorEqual = result.factor.mul === 1 && result.factor.exp === 0;

        return factorEqual && result.isUnitless;
    }

    public pow(num: Fraction): Unit<U, F, D> {
        const next = this.factor.exp * num.valueOf();
        const rem = next - Math.floor(next);

        const factor = { ...this.factor, exp: Math.floor(next) };
        this.factor.mul *= Math.pow(this.factor.base, rem);

        return new Unit(this.unitSystem, factor, {
            ...this.baseUnits,
        });
    }

    public multiply(rhs: Unit<U, F, D>): Unit<U, F, D> {
        const baseUnits: Partial<Record<keyof U, Fraction>> = {
            ...this.baseUnits,
        };

        Object.entries(rhs.baseUnits).forEach(([unit, exp]) => {
            if (unit in baseUnits) {
                (baseUnits as Record<keyof U, Fraction>)[unit as keyof U] =
                    baseUnits[unit].add(exp);
            } else {
                baseUnits[unit as keyof U] = exp;
            }
        });

        let factor = { mul: 1, base: 10, exp: 0 };
        if (this.factor !== rhs.factor) {
            const lhsFactor = this.factor;
            const rhsFactor = rhs.factor;

            const mul = lhsFactor.mul * rhsFactor.mul;

            if (lhsFactor.base === rhsFactor.base) {
                factor = {
                    mul,
                    base: lhsFactor.base,
                    exp: lhsFactor.exp + rhsFactor.exp,
                };
            } else if (lhsFactor.exp === rhsFactor.exp) {
                factor = {
                    mul,
                    base: lhsFactor.base * rhsFactor.base,
                    exp: lhsFactor.exp,
                };
            } else {
                // TODO: hide the reminder in `mul`

                throw new Error('Incompatible unit factors');
            }
        }

        return new Unit(this.unitSystem, factor, baseUnits);
    }

    public withBestFactorFor(value: number): Unit<U, F, D> {
        let result:
            | { prevDist: Fraction; factor: Unit<U, F, D>['factor'] }
            | undefined;

        Object.values(this.unitSystem.factors).forEach(({ base, exp, mul }) => {
            const expInBase = new Fraction(
                Math.floor(Math.log(Math.abs(value / mul)) / Math.log(base)),
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

    public toString(compact?: boolean): string {
        let numerator = '';
        let denominator = '';
        let denomCount = 0;

        // Factor prefix formatting
        const factorAbbrev = this.unitSystem.knownFactor(this.factor);

        if (!factorAbbrev) {
            const { mul, exp, base } = this.factor;

            if (mul !== 1) {
                numerator += `${mul} * `;
            }

            if (exp.valueOf() === 1) {
                numerator = String(base);
            } else if (exp.valueOf() !== 0) {
                numerator = `${base}^${exp}`;
            } else if (mul !== 1) {
                numerator = numerator.slice(0, -2); // remove '*'
            }
        } else {
            numerator += String(factorAbbrev);
        }

        // Unit rows formatting
        for (const baseUnit in this.baseUnits) {
            const exp = this.baseUnits[baseUnit];

            if (exp.valueOf() === 0) {
                continue;
            }

            if (exp.valueOf() === 1) {
                numerator += `${baseUnit} `;
            } else if (exp.valueOf() > 0) {
                numerator += `${baseUnit}^${exp} `;
            } else if (exp.valueOf() < 0) {
                denomCount += 1;
                denominator += ` ${baseUnit}^${-exp}`;
            }
        }

        // Combine numerator and denominator
        const s = compact ? '' : ' ';

        numerator = numerator.trim();
        denominator = denominator.trim();

        if (denomCount === 1) {
            numerator += `${s}/${s}${denominator}`;
        } else if (denomCount > 1) {
            numerator += `${s}/${s}(${denominator})`;
        }

        return numerator;
    }
}
