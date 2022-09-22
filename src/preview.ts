import Fraction from 'fraction.js';
import * as Unitlib from './index';

const w = window as any;

w.Fraction = Fraction;
w.Unitlib = Unitlib;

w.SI = new Unitlib.UnitSystem(
    { ...Unitlib.Definitions.SIBaseUnits },
    { ...Unitlib.Definitions.SIFactors },
    {},
);

console.log('loaded unitlib');
