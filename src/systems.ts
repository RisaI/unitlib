import { UnitSystem } from './UnitSystem';
import type { BaseUnitDefinition, FactorDefinition } from './types';

type TDict<Keys extends string, T> = Record<Keys, T>;
type FactorDict<Keys extends string> = TDict<Keys, FactorDefinition>;
type BUDict<Keys extends string> = TDict<Keys, BaseUnitDefinition>;

//
// SI

const SIBaseUnits_ = {
    s: {},
    m: {},
    g: {},
    A: {},
    K: {},
    mol: {},
    cd: {},
};

export const SIBaseUnits = Object.freeze(SIBaseUnits_) as BUDict<
    keyof typeof SIBaseUnits_
>;

const SIFactors_ = {
    da: { mul: 1, base: 10, exp: 1 },
    h: { mul: 1, base: 10, exp: 2 },
    k: { mul: 1, base: 10, exp: 3 },
    M: { mul: 1, base: 10, exp: 6 },
    G: { mul: 1, base: 10, exp: 9 },
    T: { mul: 1, base: 10, exp: 12 },
    P: { mul: 1, base: 10, exp: 15 },
    E: { mul: 1, base: 10, exp: 18 },
    Z: { mul: 1, base: 10, exp: 21 },
    Y: { mul: 1, base: 10, exp: 24 },

    d: { mul: 1, base: 10, exp: -1 },
    c: { mul: 1, base: 10, exp: -2 },
    m: { mul: 1, base: 10, exp: -3 },
    u: { mul: 1, base: 10, exp: -6 },
    n: { mul: 1, base: 10, exp: -9 },
    p: { mul: 1, base: 10, exp: -12 },
    f: { mul: 1, base: 10, exp: -15 },
    a: { mul: 1, base: 10, exp: -18 },
    z: { mul: 1, base: 10, exp: -21 },
    y: { mul: 1, base: 10, exp: -24 },
};

export const SIFactors = Object.freeze(SIFactors_) as FactorDict<
    keyof typeof SIFactors_
>;

export const SI = Object.freeze(new UnitSystem(SIBaseUnits, SIFactors, {}));

//
// IEC

const IECBaseUnits_ = {
    B: {},
};

export const IECBaseUnits = Object.freeze(IECBaseUnits_) as BUDict<
    keyof typeof IECBaseUnits_
>;

const IECFactors_ = {
    Ki: { mul: 1, base: 2, exp: 10 },
    Mi: { mul: 1, base: 2, exp: 20 },
    Gi: { mul: 1, base: 2, exp: 30 },
    Ti: { mul: 1, base: 2, exp: 40 },
    Pi: { mul: 1, base: 2, exp: 50 },
    Ei: { mul: 1, base: 2, exp: 60 },
    Zi: { mul: 1, base: 2, exp: 70 },
    Yi: { mul: 1, base: 2, exp: 80 },
};

export const IECFactors = Object.freeze(IECFactors_) as FactorDict<
    keyof typeof IECFactors_
>;

export const IEC = Object.freeze(new UnitSystem(IECBaseUnits, IECFactors, {}));
