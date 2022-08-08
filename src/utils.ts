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
