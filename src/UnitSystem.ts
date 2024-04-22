import Fraction from 'fraction.js';

import { Unit, UnityFactor } from './Unit.ts';

import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
} from './types';
import { divideFactors } from './utils.ts';
import { yeet } from 'yeet-ts';

export type BaseUnitsOf<S> = S extends UnitSystem<infer U, infer F, infer D>
    ? U
    : never;

export type FactorsOf<S> = S extends UnitSystem<infer U, infer F, infer D>
    ? F
    : never;

export type DerivedUnitsOf<S> = S extends UnitSystem<infer U, infer F, infer D>
    ? D
    : never;

const sortByKeyLength = <T>(obj: Record<string, T>) =>
    Object.fromEntries(
        Object.entries(obj).sort((a, b) => b[0].length - a[0].length),
    );

export class UnitSystem<
    U extends Record<string, Readonly<BaseUnitDefinition>>,
    F extends Record<string, Readonly<FactorDefinition>>,
    D extends Record<string, Readonly<DerivedUnitDefinition>>,
> {
    constructor(
        public readonly baseUnits: U,
        public readonly factors: F,
        public readonly derivedUnits: D,
    ) {
        this.baseUnits = sortByKeyLength(baseUnits) as U;
        this.derivedUnits = sortByKeyLength(derivedUnits) as D;
    }

    /**
     * Given a factor definition, tries to find a corresponding symbol for it.
     * @example
     * SI.getFactorSymbol({ mul: 1, base: 10, exp: 3 }) // "k"
     * IEC.getFactorSymbol({ mul: 1, base: 2, exp: 20 }) // "Mi"
     */
    public getFactorSymbol(
        f: FactorDefinition,
    ): (string & keyof F) | undefined {
        return Object.entries(this.factors).find(
            ([, def]) =>
                def.base === f.base &&
                def.exp.equals(f.exp) &&
                def.mul === f.mul,
        )?.[0];
    }

    public getNearestLowerFactor(needle: FactorDefinition): {
        factor: keyof F;
        ratio: number;
    } {
        let nearestLower: { ratio: number; factor: keyof F } | undefined;
        let nearestHigher: { ratio: number; factor: keyof F } | undefined;
        for (const [factor, def] of [
            ...Object.entries(this.factors),
            <const>['', { mul: 1, base: 10, exp: new Fraction(0) }],
        ]) {
            const ratio = divideFactors(needle, def);

            if (ratio >= 1) {
                if (!nearestLower || nearestLower.ratio > ratio)
                    nearestLower = { ratio, factor };
            } else {
                if (!nearestHigher || nearestHigher.ratio < ratio)
                    nearestHigher = { ratio, factor };
            }
        }

        return (
            nearestLower ??
            nearestHigher ??
            yeet('Cannot find the nearest factor as there are none.')
        );
    }

    public createUnit(
        baseUnit: Unit<U, F, D>['baseUnits'],
        factor?: FactorDefinition | keyof F,
    ): Unit<U, F, D> {
        const f =
            typeof factor === 'object'
                ? factor
                : typeof factor === 'string'
                ? { ...this.factors[factor] }
                : UnityFactor;

        return new Unit(this, f, baseUnit);
    }

    public parseUnit(text: string): Unit<U, F, D> {
        const unexpected = (char: string) => new Error(`Unexpected "${char}"`);
        const parseSingular = (text: string): Unit<U, F, D> => {
            let unit;
            unit = Object.keys(this.baseUnits).find((b) =>
                text.endsWith(b),
            ) as keyof U;

            if (!unit) {
                const factor = Object.entries(this.factors).find(
                    ([f]) => f === text,
                );

                if (factor) {
                    return this.createUnit({}, { ...factor[1] });
                }

                // TODO:
                // FIXME: Add support for derived unit detection
                // unit = Object.keys(this.derivedUnits).find((d) =>
                //     text.endsWith(d),
                // );

                throw new Error(`Unknown unit "${text}"`);
            }

            if (!unit) throw unexpected(text);

            text = text.slice(0, text.length - (unit as string).length);

            let factor;
            if (text.length > 0) {
                factor = Object.keys(this.factors).find((f) => text === f);
                if (!factor) throw new Error(`Unknown factor "${text}"`);
            }

            return new Unit(
                this,
                factor ? { ...this.factors[factor] } : UnityFactor,
                { [unit]: new Fraction(1) } as Partial<
                    Record<keyof U, Fraction>
                >,
            );
        };

        // Remove unnecessary symbols
        text = text.trim().replace('  ', ' ');

        // Parse factor
        const factor: FactorDefinition = { ...UnityFactor };
        {
            const factorRegex =
                /^(?<mul>\d+[\.,]?\d*)?\s*\*?\s*((?<base>\d+)\^(?<exp>-?\s*\d+\s*(\/\s*\d+)?))?\s*\*?\s*/;
            const match = text.match(factorRegex);
            text = text.slice(match?.[0].length ?? 0);

            const { mul, base, exp } = match?.groups ?? {};

            if (mul) factor.mul = Number.parseFloat(mul);
            if (base) factor.base = Number.parseInt(base);
            if (exp) factor.exp = new Fraction(exp);
        }

        // Initialize next unit
        let result = new Unit(this, factor, {});
        let denom = false;

        outer: for (let i = 0; i < text.length; ) {
            // Skip whitespace
            switch (text.charAt(i)) {
                case '/': // Toggle denominator mode
                    if (denom) throw unexpected('/');
                    denom = true;
                case ' ': // Skip whitespaces
                    i += 1;
                    continue;
                case '(': {
                    // Parse
                    let openCounter = 0;
                    for (let j = i + 1; j < text.length; ++j) {
                        switch (text.charAt(j)) {
                            case '(':
                                openCounter += 1;
                                continue;
                            case ')':
                                openCounter -= 1;
                                if (openCounter < 0) {
                                    const mul = this.parseUnit(
                                        text.slice(i + 1, j),
                                    );
                                    result = result.multiply(
                                        denom ? mul.inverse() : mul,
                                    );
                                    i = j + 1;
                                    continue outer;
                                }
                                continue;
                        }
                    }

                    throw new Error('Unmatched "("');
                }
            }

            let unit = '';
            for (let j = i; j <= text.length; ++j) {
                if (text[j]?.match(/[A-Za-z%_]/)?.[0]) continue;

                if (i == j) {
                    throw unexpected(text[j]);
                } else {
                    unit = text.slice(i, j);
                    i = j;
                    break;
                }
            }

            let exp = new Fraction(1);
            if (text[i] === '^') {
                if (text[i + 1] === '(') {
                    // Read exponents in brackets
                    let openCounter = 0;
                    exp: for (let j = i + 2; j < text.length + 1; ++j) {
                        if (j === text.length) throw new Error('Unmatched "("');

                        switch (text.charAt(j)) {
                            case '(':
                                openCounter += 1;
                                continue;
                            case ')':
                                openCounter -= 1;
                                if (openCounter < 0) {
                                    exp = new Fraction(text.slice(i + 2, j));
                                    i = j + 1;
                                    break exp;
                                }
                                continue;
                        }
                    }
                } else {
                    // no brackets
                    for (let j = i + 1; j < text.length + 1; ++j) {
                        if (text[j]?.match(/[-\d\/]/)?.[0]) continue;
                        exp = new Fraction(text.slice(i + 1, j));
                        i = j + 1;
                        break;
                    }
                }
            }

            if (denom) exp = exp.neg();

            result = result.multiply(parseSingular(unit).pow(exp));
        }

        return result;
    }
}
