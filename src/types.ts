export interface BaseUnitDefinition {}

export interface FactorDefinition {
    mul: number;
    base: number;
    exp: number;
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
}

export interface QuantityFormatOptions extends UnitFormatOptions {}
