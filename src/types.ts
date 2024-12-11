import Fraction from 'fraction.js';
import type { Unit } from './Unit';
import type { Quantity } from './Quantity';

export const TYPE_TAG = '__unitlib_type';
export const UNIT_TYPE = 'Unit';
export const QUANTITY_TYPE = 'Quantity';

const typeTagIs = (x: unknown, val: any) =>
    typeof x === 'object' && x !== null && TYPE_TAG in x && x[TYPE_TAG] === val;

export const isUnit = (x: unknown): x is Unit<any, any, any> =>
    typeTagIs(x, UNIT_TYPE);

export const isQuantity = (x: unknown): x is Quantity<any, any, any> =>
    typeTagIs(x, QUANTITY_TYPE);

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
    allowNegativeZero?: boolean;

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
