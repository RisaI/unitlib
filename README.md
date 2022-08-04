# unitlib
A modern library for unit conversion and manipulation with zero dependencies and a small bundle size.

**Installation:**
```sh
pnmp install unitlib
# or
yarn add unitlib
# or
npm install unitlib
```

**Example usage:**
```typescript
import { SI } from 'unitlib/systems';

const x = SI.parseQuantity('3.2 kW s / kg').toBaseUnits();
x.value // 3200
x.unit.toString() // "m^2 / s^2"

x.toString() // "3200 m^2 / s^2"
x.toString({ compact: true, fancyUnicode: true }) // "3200m²/s²"
x.toString({ forceExponential: true }) // "3.2 * 10^3 m^2 / s^2"

x.toParts({ forceExponential: true })
// [
//   { type: 'multiplicator', string: '3.2', number: 3.2 },
//   { type: 'multiplicationSign', string: '*' },
//   { type: 'base', string: '10', number: 10 },
//   { type: 'exponent', string: '^3', number: 3 },
//   { type: 'unit', string: 'm^2', prefix: '', baseUnit: 'm', exponent: { string: '^2', number: 2 } },
//   { type: 'divisionSign', string: '/' },
//   { type: 'unit', string: 's^2', prefix: '', baseUnit: 's', exponent: { string: '^2', number: 2 } }
// ]
```

## Main concepts
 * **Quantity**, for example _“2 km”_ or _“8.2 MiB/s”_, is a numerical value together with a unit. You can perform arithmetic operations on quantities, or convert them to a different unit.
 * **Unit** can be either simple, for example _“km“_ or _“W”_, or composite, for example _“kWh/m²“_. Simple units are always simplified to a reduced fraction of base units, while composite units allow for things like _“Wh/s”_ to remain unsimplified.
 * **System**, for example [_SI_](https://en.wikipedia.org/wiki/International_System_of_Units), [_Imperial_](https://en.wikipedia.org/wiki/United_States_customary_units) or [_IEC_](https://en.wikipedia.org/wiki/Binary_prefix), is a collection of base units and their prefixes.

