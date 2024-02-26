import Fraction from 'fraction.js';

export interface BaseUnitDefinition {}

export interface FactorDefinition {
    mul: number;
    base: number;
    exp: Fraction;
}

export interface DerivedUnitDefinition {}

export type RoundingStrategy =
    | 'down'
    | 'up'
    | 'toward-zero'
    | 'away-from-zero'
    | 'to-even'
    | 'to-odd'
    | 'stochastic'
    | 'half-down'
    | 'half-up'
    | 'half-toward-zero'
    | 'half-away-from-zero'
    | 'half-to-even'
    | 'half-to-odd'
    | 'half-random';

export interface NumberFormatOptions {
    fancyUnicode?: boolean;

    fractionalPartSeparator?: string;
    decimalPlaces?: number;
    roundingStrategy?: RoundingStrategy;

    digitGroupSeparator?: string;
    digitGroupLength?: number;
}

export interface UnitFormatOptions extends NumberFormatOptions {
    compact?: boolean;
    forceExponential?: boolean;
    useNegativeExponents?: boolean;
    omitDenominatorParens?: boolean;
}

export interface QuantityFormatOptions extends UnitFormatOptions {}

export type UnitFormatExponentPart = {
    type: 'exponent';
    string: string;
    fraction: Fraction;
    number: number;
};
export type UnitFormatUnitPart = {
    type: 'unit';
    string: string;
    prefix: string;
    baseUnit: string;
    exponent?: UnitFormatExponentPart;
    denominator?: true;
};
export type UnitFormatPart =
    | UnitFormatExponentPart
    | UnitFormatUnitPart
    | { type: 'parens'; string: string; contents: UnitFormatPart[] }
    | { type: 'multiplicator'; string: string; number: number }
    | { type: 'base'; string: string; number: number }
    | { type: 'multiplicationSign'; string: string }
    | { type: 'divisionSign'; string: string };
