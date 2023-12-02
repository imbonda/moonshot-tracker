// 3rd party.
import { BigNumberish, toBeHex } from 'ethers';
import millify from 'millify';

export { isEmpty, merge as mergeDeep } from 'lodash';

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

export function pretifyNumber(value: number): string {
    return millify(value, { precision: 2 });
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
    return `$${pretifyNumber(value)}`;
}

const NUMBER_EMOJI_MAP: Record<number, string> = {
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
        return NUMBER_EMOJI_MAP[0];
    }

    return `${wholeNumber}`.split('').map((digit) => NUMBER_EMOJI_MAP[Number(digit)]).join('');
}
