// 3rd party.
import { BigNumberish, toBeHex } from 'ethers';
import _prettyTime from 'pretty-time';
import millify from 'millify';
// Internal.
import { MS_IN_SECOND } from './constants';

export { flatten, isEmpty, merge as mergeDeep } from 'lodash';

interface ExponentialBackoffOptions {
    minDelay?: number,
    maxDelay?: number,
}

export function exponentialBackoff(times: number, options?: ExponentialBackoffOptions): number {
    const minDelay = options?.minDelay || 1 * MS_IN_SECOND;
    const maxDelay = options?.maxDelay || 60 * MS_IN_SECOND;
    return Math.max(Math.min(Math.exp(times), maxDelay), minDelay);
}

export async function sleep(timeMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeMs);
    });
}

export function hexifyNumber(number: BigNumberish): string {
    const hex = toBeHex(number);
    const hasLeadingZero = (hex.charAt(2) === '0');
    if (hasLeadingZero) {
        return `0x${hex.slice(3)}`;
    }
    return hex;
}

export function calcBlockNumber(blockNumber: BigNumberish, offset: BigNumberish): string {
    return hexifyNumber(BigInt(blockNumber) + BigInt(offset));
}

export function prettyNumber(value: number): string {
    return millify(value, { precision: 2 });
}

export function prettyTime(timeMs: number, smallestUnit: string = 'ms'): string {
    return _prettyTime(timeMs * MS_IN_SECOND, smallestUnit);
}

export function formatUSD(value: number, nanStringValue: string = ''): string {
    const isNumber = ['number', 'bigint'].includes(typeof value);
    const isNaN = Number.isNaN(value);
    const isFinite = Number.isFinite(value);
    if (!isNumber || isNaN) {
        return nanStringValue;
    }
    if (value < 0) {
        return `-${formatUSD(-value, nanStringValue)}`;
    }
    if (!isFinite) {
        return 'Infinity';
    }
    return `$${prettyNumber(value)}`;
}

const DIGIT_TO_EMOJI: Record<number, string> = {
    0: '0️⃣',
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣',
    7: '7️⃣',
    8: '8️⃣',
    9: '9️⃣',
};

export function emojifyNumber(positive: number): string {
    const wholeNumber = Math.trunc(positive);
    if (!wholeNumber) {
        return DIGIT_TO_EMOJI[0];
    }

    return `${wholeNumber}`.split('').map((digit) => DIGIT_TO_EMOJI[Number(digit)]).join('');
}

const RISK_LEVEL_TO_EMOJI = {
    low: '🟢',
    medium: '🟠',
    high: '🔴',
    default: '⚪️',
};

export function emojifyRiskLevel(riskLevel?: string): string {
    return RISK_LEVEL_TO_EMOJI[riskLevel as keyof typeof RISK_LEVEL_TO_EMOJI]
        || RISK_LEVEL_TO_EMOJI.default;
}
