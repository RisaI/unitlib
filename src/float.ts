import { NumberFormatOptions, RoundingStrategy } from './types';

export interface ApproximateEqualityThreshold {
    /**
     * Number of ULPs, or _units of lowest precision_, between the
     * compared numbers. This corresponds to how many representable
     * numbers there are between the two numbers that are being
     * compared (plus one, technically, as we're taking the difference
     * of ULPs). After _N_ well-behaved floating point operations, the
     * expected error is roughly _sqrt(N)_ ULPs.
     */
    ulps?: number;

    /**
     * The absolute difference between the two compared numbers.
     */
    abs?: number;

    /**
     * The relative difference between the two numbers being compared.
     * If both numbers are normal, the difference is relative to the
     * number with the smaller magnitude. If one of the numbers is
     * subnormal, then the difference is relative to the smallest
     * normal number.
     */
    rel?: number;
}

const f64View = new Float64Array(1);
const i64View = new BigInt64Array(f64View.buffer);
export function ulpDistance(a: number, b: number): number {
    if (isNaN(a) || isNaN(b)) return Infinity;
    if (a === b) return 0;

    const aIsNegative = a < 0;
    const bIsNegative = b < 0;
    if (aIsNegative !== bIsNegative) {
        return ulpDistance(Math.abs(a), 0) + ulpDistance(Math.abs(b), 0);
    }

    f64View[0] = a;
    const i = i64View[0];
    f64View[0] = b;
    const j = i64View[0];

    return Math.abs(Number(i - j));
}

export function absDistance(a: number, b: number): number {
    if (a === b) return 0;
    if (!isFinite(a) || !isFinite(b)) return Infinity;
    return Math.abs(a - b);
}

export const MIN_NORMAL_NUMBER = 2 ** -1022;

export function relDistance(a: number, b: number): number {
    if (a === b) return 0;
    if (!isFinite(a) || !isFinite(b)) return Infinity;

    const min = Math.min(Math.abs(a), Math.abs(b));
    const scale = Math.max(min, MIN_NORMAL_NUMBER);

    return Math.abs(a - b) / scale;
}

export function areApproximatelyEqual(
    a: number,
    b: number,
    thresholds: ApproximateEqualityThreshold = {},
): boolean {
    const thr: [keyof ApproximateEqualityThreshold, number][] = Object.entries(
        thresholds,
    ).filter(([_, n]) => n !== undefined) as any[];

    if (thr.length === 0) thr.push(['ulps', 1024], ['rel', 2 ** -43]);

    for (const [test, value] of thr) {
        switch (test) {
            case 'ulps':
                if (ulpDistance(a, b) < value) return true;
                break;
            case 'rel':
                if (relDistance(a, b) < value) return true;
                break;
            case 'abs':
                if (absDistance(a, b) < value) return true;
        }
    }

    return false;
}

export function formatFloat(
    n: number,
    {
        fancyUnicode,
        decimalPlaces,
        roundingStrategy,
        digitGroupLength,
        digitGroupSeparator,
        fractionalPartSeparator,
    }: NumberFormatOptions,
): string {
    fractionalPartSeparator ??= '.';
    digitGroupSeparator ??= fancyUnicode ? ' ' : ' ';
    roundingStrategy ??= 'half-to-even';
    const minusSign = fancyUnicode ? '−' : '-';
    decimalPlaces ??= n.toString().split('.')[1]?.length ?? 0;

    const sign = Math.sign(n);

    let integerPart = BigInt(
        roundFloat(n, decimalPlaces === 0 ? roundingStrategy : 'down'),
    );

    const fractionalPart = Math.abs(n) % 1;
    let fractionalDigits = BigInt(
        roundFloat(
            fractionalPart * 10 ** decimalPlaces,
            decimalPlaces === 0 ? 'down' : roundingStrategy,
        ),
    );

    integerPart += fractionalDigits / 10n ** BigInt(decimalPlaces);
    fractionalDigits %= 10n ** BigInt(decimalPlaces);

    const result: string[] = [];
    if (sign < 0) result.push(minusSign);

    const integerPartStr = integerPart.toString();
    result.push(
        digitGroupLength === undefined
            ? integerPartStr
            : groupAndSeparate(
                  integerPartStr,
                  digitGroupLength,
                  digitGroupSeparator,
                  'from-end',
              ),
    );

    if (decimalPlaces > 0) {
        result.push(fractionalPartSeparator);
        const fractionalDigitsStr = fractionalDigits
            .toString()
            .padStart(decimalPlaces, '0');
        result.push(
            digitGroupLength === undefined
                ? fractionalDigitsStr
                : groupAndSeparate(
                      fractionalDigitsStr,
                      digitGroupLength,
                      digitGroupSeparator,
                      'from-start',
                  ),
        );
    }

    return result.join('');
}

function groupAndSeparate(
    str: string,
    groupLength: number,
    separator: string,
    order: 'from-start' | 'from-end',
): string {
    const reverse = order === 'from-end';
    if (reverse) str = [...str].reverse().join('');

    const result: string[] = [];
    let i = 0;
    for (const ch of str) {
        if (i++ >= groupLength) {
            result.push(separator);
            i = 1;
        }
        result.push(ch);
    }

    if (reverse) result.reverse();
    return result.join('');
}

export function roundFloat(n: number, strategy: RoundingStrategy): number {
    const ceil = Math.ceil(n);
    const floor = Math.floor(n);

    switch (strategy) {
        case 'up':
            return ceil;
        case 'down':
            return floor;
        case 'toward-zero':
            return n < 0 ? ceil : floor;
        case 'away-from-zero':
            return n < 0 ? floor : ceil;
        case 'to-even':
            return floor % 2 === 0 ? floor : ceil;
        case 'to-odd':
            return floor % 2 === 0 ? ceil : floor;
    }

    const fractionalPart = Math.abs(n) % 1;
    if (strategy === 'stochastic') {
        return Math.random() < fractionalPart ? ceil : floor;
    }

    if (fractionalPart !== 0.5) return Math.round(n);

    switch (strategy) {
        case 'half-up':
            return ceil;
        case 'half-down':
            return floor;
        case 'half-toward-zero':
            return n < 0 ? ceil : floor;
        case 'half-away-from-zero':
            return n < 0 ? floor : ceil;
        case 'half-to-even':
            return floor % 2 === 0 ? floor : ceil;
        case 'half-to-odd':
            return floor % 2 === 0 ? ceil : floor;
        case 'half-random':
            return Math.random() < 0.5 ? floor : ceil;
    }
}

formatFloat(0.95, { decimalPlaces: 1 }); // 0.95
