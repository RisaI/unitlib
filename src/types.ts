import type { Unit } from './Unit';

export declare type ValueWithUnit<Num, Un> = Un extends Unit<
    infer U,
    infer F,
    infer D
>
    ? {
          val: Num;
          unit: Unit<U, F, D>;
      }
    : never;

export type BaseUnitDefinition = {};

export type FactorDefinition = { mul: number; base: number; exp: number };

export type DerivedUnitDefinition = {};
