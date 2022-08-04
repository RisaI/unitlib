import { Unit } from './Unit';

import type {
    BaseUnitDefinition,
    DerivedUnitDefinition,
    FactorDefinition,
} from './types';

export type BaseUnitsOf<S> = S extends UnitSystem<infer U, infer F, infer D>
    ? U
    : never;

export type FactorsOf<S> = S extends UnitSystem<infer U, infer F, infer D>
    ? U
    : never;

export type DerivedUnitsOf<S> = S extends UnitSystem<infer U, infer F, infer D>
    ? U
    : never;

export class UnitSystem<
    U extends Record<string, BaseUnitDefinition>,
    F extends Record<string, FactorDefinition>,
    D extends Record<string, DerivedUnitDefinition>,
> {
    constructor(
        public readonly baseUnits: U,
        public readonly factors: F,
        public readonly derivedUnits: D,
    ) {}

    public knownFactor(f: FactorDefinition): keyof F | undefined {
        return Object.entries(this.factors).find(
            ([, def]) =>
                def.base === f.base && def.exp === f.exp && def.mul === f.mul,
        )?.[0];
    }

    public parseUnit(text: string): Unit<U, F, D> {
        function parseRow(row: string): Unit<U, F, D> {}

        const [numerator, denominator] = text.split('/').map((s) => s.trim());

        return new Unit(this, 'k', {});
    }
}
