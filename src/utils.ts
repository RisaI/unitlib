import Fraction from 'fraction.js';
import { Compactness, FactorDefinition } from './types.ts';

export const divideFactors = (
    a: Readonly<FactorDefinition>,
    b: Readonly<FactorDefinition>,
): number => {
    const baseLogRatio = Math.log(a.base) / Math.log(b.base);
    return (a.mul / b.mul) * a.base ** (+a.exp - +b.exp * baseLogRatio);
};

export const normalizeFactor = (
    factor: Readonly<FactorDefinition>,
): FactorDefinition => {
    if (factor.base === 1)
        return {
            mul: factor.mul,
            base: 1,
            exp: new Fraction(0),
        };

    const sign = Math.sign(factor.mul);
    const logInBase = Math.log(factor.mul * sign) / Math.log(factor.base);
    const order = Math.floor(logInBase);

    if (order === 0) {
        return { ...factor };
    }

    return {
        base: factor.base,
        exp: factor.exp.add(order),
        mul: sign * Math.pow(factor.base, logInBase - order),
    };
};

export const factorPow = (
    factor: Readonly<FactorDefinition>,
    exp: Fraction,
): FactorDefinition => {
    return {
        mul: factor.mul ** +exp,
        base: factor.base,
        exp: factor.exp.mul(exp),
    };
};

const unicodeMap: { [key: string]: string } = {
    '-': '⁻',
    '/': '⸍',
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
};

export function toUnicodeSuperscript(exponent: string) {
    let result = '';

    for (const digit of exponent) {
        if (digit in unicodeMap) {
            result += unicodeMap[digit];
            continue;
        }
    }

    return result;
}

export function parseCompactConfig(compact: boolean | Compactness | undefined) {
    const get = <K extends keyof Compactness>(k: K): boolean =>
        typeof compact === 'object' ? compact[k] ?? true : !compact;

    return {
        spaceAfterNumericPart: get('spaceAfterNumericPart'),
        spacesAroundDivision: get('spacesAroundDivision'),
        spacesAroundMultiplication: get('spacesAroundMultiplication'),
    };
}
