import Fraction from 'fraction.js';

import { UnitSystem } from './UnitSystem.ts';

import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
    UnitFormatExponentPart,
    UnitFormatOptions,
    UnitFormatPart,
    UnitFormatUnitPart,
} from './types.ts';
import { factorPow, normalizeFactor, toUnicodeSuperscript } from './utils.ts';
import {
    ApproximateEqualityThreshold,
    areApproximatelyEqual,
    formatFloat,
} from './float.ts';

export const UnityFactor: FactorDefinition = {
    mul: 1,
    base: 10,
    exp: new Fraction(0),
};
Object.freeze(UnityFactor);

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

    public get isZero(): boolean {
        return this.factor.mul === 0;
    }

    public get isUnitless(): boolean {
        return (
            this.isZero ||
            !Object.values(this.baseUnits).some(
                (v) => v !== undefined && +v !== 0,
            )
        );
    }

    public inverse(): Unit<U, F, D> {
        const factor = { ...this.factor };

        factor.exp = factor.exp.neg();
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
        if (!this.factor.exp.equals(rhs.factor.exp)) return false;
        if (+this.factor.exp === 0) return true;
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
            this.factor.mul * this.factor.base ** +this.factor.exp,
            rhs.factor.mul * rhs.factor.base ** +rhs.factor.exp,
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

        factor.exp = factor.exp.mul(num);
        factor.mul = factor.mul ** +num;

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

        if (+rhsFactor.exp === 0) {
            rhsFactor = { ...rhsFactor, base: lhsFactor.base };
        } else if (+lhsFactor.exp === 0) {
            lhsFactor = { ...lhsFactor, base: rhsFactor.base };
        }

        if (lhsFactor.base === rhsFactor.base) {
            factor.base = lhsFactor.base;
            factor.exp = lhsFactor.exp.add(rhsFactor.exp);
        } else {
            const [major, minor] =
                lhsFactor.base < rhsFactor.base
                    ? [rhsFactor, lhsFactor]
                    : [lhsFactor, rhsFactor];

            factor.base = major.base;
            factor.exp = major.exp;

            const furtherExp =
                (+minor.exp * Math.log(minor.base)) / Math.log(major.base);
            factor.exp = factor.exp.add(Math.floor(furtherExp));
            factor.mul *= major.base ** (furtherExp - Math.floor(furtherExp));

            // TODO: check correctness
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
        // TODO code review

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
                            +this.factor.exp * Math.log(this.factor.base)) /
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
        return value * mul * base ** +exp;
        // return Math.exp(Math.log(mul * value) + +exp * Math.log(base));
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
        return value / (mul * base ** +exp);
        // return Math.exp(Math.log(value / mul) - exp * Math.log(base));
    }

    public toString(opts: UnitFormatOptions = {}): string {
        return this.toParts(opts)
            .map(({ string }) => string)
            .join('');
    }

    public toParts(opts: UnitFormatOptions = {}): UnitFormatPart[] {
        /* Helper functions */
        const pad = (str: string) => (opts.compact ? str : ` ${str} `);
        const unitPart = (): UnitFormatPart => ({
            type: 'multiplicator',
            string: '1',
            number: 1,
        });
        const mulSign = (): UnitFormatPart => ({
            type: 'multiplicationSign',
            string: pad(opts.fancyUnicode ? '·' : '*'),
        });
        const divSign = (): UnitFormatPart => ({
            type: 'divisionSign',
            string: pad('/'),
        });
        const expParts = (exp: Fraction): UnitFormatExponentPart[] =>
            +exp === 1
                ? []
                : [
                      {
                          type: 'exponent',
                          fraction: exp,
                          number: +exp,
                          string: opts.fancyUnicode
                              ? toUnicodeSuperscript(exp.toFraction())
                              : '^' + exp.toFraction(),
                      },
                  ];
        const factorInExponentialForm = ({
            mul,
            exp,
            base,
        }: FactorDefinition): UnitFormatPart[] => {
            const parts: UnitFormatPart[] = [];

            if (mul !== 1)
                parts.push({
                    type: 'multiplicator',
                    string: formatFloat(mul, opts),
                    number: mul,
                });
            if (exp.valueOf() !== 0) {
                if (parts.length > 0) parts.push(mulSign());

                parts.push({
                    type: 'base',
                    string: formatFloat(base, opts),
                    number: base,
                });
                parts.push(...expParts(exp));
            }

            return parts;
        };
        const parens = (contents: UnitFormatPart[]): UnitFormatPart => ({
            type: 'parens',
            string: '(' + contents.map(({ string }) => string).join('') + ')',
            contents,
        });

        /* Formatting */

        // If this unit is just a number, print it out as a number
        if (this.isUnitless) {
            const parts = factorInExponentialForm(this.factor);
            if (parts.length > 0) return parts;
            return [unitPart()];
        }

        // Format base units
        const numerator: UnitFormatPart[] = [];
        const denominator: UnitFormatPart[] = [];

        for (const baseUnit in this.baseUnits) {
            const exp = this.baseUnits[baseUnit];
            if (exp === undefined || +exp === 0) continue;

            if (+exp < 0 && !opts.useNegativeExponents) {
                // we're pushing into denominator, so change the sign of exp
                const exponent = expParts(exp.neg()).at(0);
                denominator.push({
                    type: 'unit',
                    string: baseUnit + (exponent?.string ?? ''),
                    baseUnit,
                    exponent,
                    prefix: '',
                    denominator: true,
                });
            } else {
                const exponent = expParts(exp).at(0);
                numerator.push({
                    type: 'unit',
                    string: baseUnit + (exponent?.string ?? ''),
                    baseUnit,
                    exponent,
                    prefix: '',
                });
            }
        }

        // Add spaces between adjacent base units
        for (let i = 0; i < numerator.length - 1; i++) {
            numerator[i].string += ' ';
        }
        for (let i = 0; i < denominator.length - 1; i++) {
            denominator[i].string += ' ';
        }

        // Try to format the factor as a prefix for the first unit
        let factorInserted = false;
        if (!opts.forceExponential) {
            let firstUnitFactor: FactorDefinition | undefined;
            let firstUnit: UnitFormatUnitPart | undefined;

            if (numerator.length > 0) {
                if (numerator[0].type === 'unit') {
                    firstUnit = numerator[0];
                    firstUnitFactor = factorPow(
                        this.factor,
                        firstUnit.exponent?.fraction.inverse() ??
                            new Fraction(1),
                    );
                }
            } else {
                // Edge case: if there are no units with a positive exponent, take
                // steps to avoid 1000s⁻¹ turning into k/s or ks⁻¹
                if (denominator[0].type === 'unit') {
                    firstUnit = denominator[0];
                    firstUnitFactor = factorPow(
                        this.factor,
                        firstUnit.exponent?.fraction.neg().inverse() ??
                            new Fraction(-1),
                    );
                }
            }

            if (firstUnitFactor && firstUnit) {
                const firstUnitFactorSymbol =
                    this.unitSystem.getFactorSymbol(firstUnitFactor);

                if (firstUnitFactorSymbol) {
                    firstUnit.prefix = firstUnitFactorSymbol;
                    firstUnit.string = firstUnitFactorSymbol + firstUnit.string;
                    factorInserted = true;
                }
            }
        }

        // Inserting the factor as a standard prefix has not succeeded.
        // We're going to format it in an exponential form.
        if (!factorInserted) {
            const partsToAdd = factorInExponentialForm(this.factor);

            // Add a space if needed
            if (!opts.compact && numerator.length > 0) {
                const lastPart = partsToAdd.at(-1);
                if (lastPart) lastPart.string += ' ';
            }

            numerator.unshift(...partsToAdd);
        }

        // If there's no numerator, add at least a "1"
        if (numerator.length === 0) numerator.push(unitPart());

        // Combine numerator and denominator
        const parts = [...numerator];
        if (denominator.length > 0) {
            parts.push(divSign());

            if (denominator.length > 1 && !opts.omitDenominatorParens) {
                parts.push(parens(denominator));
            } else {
                parts.push(...denominator);
            }
        }

        return parts;
    }
}
