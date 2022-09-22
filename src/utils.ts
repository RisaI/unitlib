import { FactorDefinition } from './types';

export const normalizeFactor = (
    factor: Readonly<FactorDefinition>,
): FactorDefinition => {
    const sign = Math.sign(factor.mul);
    const logInBase = Math.log(factor.mul * sign) / Math.log(factor.base);
    const order = Math.floor(logInBase);

    if (order === 0) {
        return { ...factor };
    }

    return {
        base: factor.base,
        exp: factor.exp + order,
        mul: sign * Math.pow(factor.base, logInBase - order),
    };
};

const unicodeMap: { [key: string]: string } = {
    '-': '⁻',
    '/': '⸍',
    '1': '¹',
    '2': '²',
    '3': '³',
};

const code = (d: string) => d.charCodeAt(0);

export function toUnicodeSuperscript(exponent: string) {
    let result = '';

    for (const digit of exponent) {
        if (digit in unicodeMap) {
            result += unicodeMap[digit];
            continue;
        }

        const c = code(digit);
        if (c >= code('0') && c <= code('9')) {
            result += String.fromCharCode(code('⁰') + (c - code('0')));
        }
    }

    return result;
}
