import Fraction from 'fraction.js';
import * as Unitlib from './index';
import * as Systems from './systems';

const w = window as any;

w.Fraction = Fraction;
w.Unitlib = Unitlib;
w.Systems = Systems;

console.log('loaded unitlib');
