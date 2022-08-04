import type { BaseUnitDefinition, FactorDefinition } from "./types";

export class GenericUnit<
  T extends Record<string, BaseUnitDefinition>,
  F extends Record<string, FactorDefinition>
> {
  constructor(
    public readonly baseUnits: Partial<Record<keyof T, number>>,
    public readonly factor: keyof F | FactorDefinition = {
      mul: 1,
      base: 10,
      exp: 0,
    },
    public readonly baseUnitDefinitions: T,
    public readonly factorDefinitions: F
  ) {}

  // From definitions
  public knownFactor(base: number, exp: number): string | undefined {
    return Object.entries(this.factorDefinitions).find(
      ([, def]) => def.base === base && def.exp === exp
    )?.[0];
  }

  // From specific unit
  public exponentOf(baseUnit: keyof T): number {
    return this.baseUnits[baseUnit] ?? 0;
  }

  public get isUnitless(): boolean {
    return !Object.values(this.baseUnits).some((v) => v !== 0);
  }

  public get factorDefinition(): FactorDefinition {
    return typeof this.factor === "object"
      ? this.factor
      : this.factorDefinitions[this.factor];
  }

  public multiply(rhs: GenericUnit<T, F>): GenericUnit<T, F> {
    const baseUnits: GenericUnit<T, F>["baseUnits"] = { ...this.baseUnits };

    Object.entries(rhs.baseUnits).forEach(([unit, exp]) => {
      if (unit in baseUnits) {
        (baseUnits as Record<keyof T, number>)[unit as keyof T] +=
          exp as number;
      } else {
        baseUnits[unit as keyof T] = exp as number;
      }
    });

    let factor = { base: 10, exp: 0 };
    if (this.factor !== rhs.factor) {
      const lhsFactor = this.factorDefinition;
      const rhsFactor = rhs.factorDefinition;

      if (lhsFactor.base === rhsFactor.base) {
        factor = {
          base: lhsFactor.base,
          exp: lhsFactor.exp + rhsFactor.exp,
        };
      } else if (lhsFactor.exp === rhsFactor.exp) {
        factor = {
          base: lhsFactor.base * rhsFactor.base,
          exp: lhsFactor.exp,
        };
      } else {
        throw new Error("Incompatible unit factors");
      }
    }

    return this.constructor(
      baseUnits,
      this.knownFactor(factor.base, factor.exp) ?? factor,
      this.baseUnitDefinitions,
      this.factorDefinitions
    );
  }

  public withBestFactorFor(value: number): GenericUnit<T, F> {
    let result:
      | { prevDist: number; factor: GenericUnit<T, F>["factor"] }
      | undefined;

    Object.entries(this.factorDefinitions).forEach(
      ([factor, { base, exp }]) => {
        const expInBase = Math.log(Math.abs(value)) / Math.log(base);
        const dist = expInBase - exp;

        if (dist >= 0 && (!result || dist < result.prevDist)) {
          result = {
            prevDist: dist,
            factor: factor as keyof F,
          };
        }
      }
    );

    return this.constructor(
      { ...this.baseUnits },
      result?.factor ?? 1,
      this.baseUnitDefinitions,
      this.factorDefinitions
    );
  }

  public applyFactor(value: number): number {
    const factor = this.factorDefinition;

    if (factor.exp === 0) return value;

    return Math.exp(Math.log(value) - factor.exp * Math.log(factor.base));
  }

  public toString(compact?: boolean): string {
    let numerator = "";
    let denominator = "";
    let denomCount = 0;

    if (typeof this.factor === "object") {
      const factor = this.factorDefinition;
      if (factor.exp === 1) {
        numerator = String(factor.base);
      } else if (factor.exp !== 0) {
        numerator = `${factor.base}^${factor.exp}`;
      }
    } else {
      numerator += String(this.factor);
    }

    for (const baseUnit in this.baseUnits) {
      const exp = this.baseUnits[baseUnit];

      if (exp === 0) {
        continue;
      }

      if (exp === 1) {
        numerator += `${baseUnit} `;
      } else if (exp > 0) {
        numerator += `${baseUnit}^${exp} `;
      } else if (exp < 0) {
        denomCount += 1;
        denominator += ` ${baseUnit}^${-exp}`;
      }
    }

    const s = compact ? "" : " ";

    numerator = numerator.trim();
    denominator = denominator.trim();

    if (denomCount === 1) {
      numerator += `${s}/${s}${denominator}`;
    } else if (denomCount > 1) {
      numerator += `${s}/${s}(${denominator})`;
    }

    return numerator;
  }

  // TODO: parse
}
