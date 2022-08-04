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
        public readonly baseUnits: Partial<Record<keyof U, number>>,
    ) {}

    // From specific unit
    public exponentOf(baseUnit: keyof U): number {
        return this.baseUnits[baseUnit] ?? 0;
    }

    public get isUnitless(): boolean {
        return !Object.values(this.baseUnits).some((v) => v !== 0);
    }

    public inverse(): Unit<U, F, D> {
        const factor = { ...this.factor };

        factor.exp = -factor.exp;
        factor.mul = 1 / factor.mul;

        return new Unit(
            this.unitSystem,
            factor,
            Object.fromEntries(
                Object.entries(this.baseUnits).map(([a, b]) => [a, -b]),
            ) as Record<keyof U, number>,
        );
    }

    public multiply(rhs: Unit<U, F, D>): Unit<U, F, D> {
        const baseUnits: Partial<Record<keyof U, number>> = {
            ...this.baseUnits,
        };

        Object.entries(rhs.baseUnits).forEach(([unit, exp]) => {
            if (unit in baseUnits) {
                (baseUnits as Record<keyof U, number>)[unit as keyof U] +=
                    exp as number;
            } else {
                baseUnits[unit as keyof U] = exp as number;
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
                throw new Error('Incompatible unit factors');
            }
        }

        return new Unit(this.unitSystem, factor, baseUnits);
    }

    public withBestFactorFor(value: number): Unit<U, F, D> {
        let result:
            | { prevDist: number; factor: Unit<U, F, D>['factor'] }
            | undefined;

        Object.values(this.unitSystem.factors).forEach(({ base, exp, mul }) => {
            const expInBase = Math.log(Math.abs(value / mul)) / Math.log(base);
            const dist = expInBase - exp;

            if (dist >= 0 && (!result || dist < result.prevDist)) {
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

        if (exp === 0 && mul === 1) return value;

        return Math.exp(Math.log(value / mul) - exp * Math.log(base));
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

            if (exp === 1) {
                numerator = String(base);
            } else if (exp !== 0) {
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

            if (exp === 0) {
                continue;
            }

            if (exp === 1) {
                numerator += `${baseUnit} `;
            } else if (exp > 0) {
                numerator += `${baseUnit}^${exp} `;
            } else if (exp < 0) {
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
