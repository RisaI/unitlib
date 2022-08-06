import type { Unit } from './Unit';

export type ValueWithUnit<Num, U extends Unit<{}, {}, {}>> = {
    val: Num;
    unit: U;
};

export type BaseUnitDefinition = {};

export type FactorDefinition = { mul: number; base: number; exp: number };

export type DerivedUnitDefinition = {};
