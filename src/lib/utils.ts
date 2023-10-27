// 3rd party.
import { BigNumberish, toBeHex } from 'ethers';

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
