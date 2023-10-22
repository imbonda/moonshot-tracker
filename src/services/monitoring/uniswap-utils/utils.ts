// 3rd party.
import { BigNumberish, Log } from 'ethers';

const ADDRESS_LENGTH = 20 * 2;

export function parsePairAddress(log: Log) {
    const offset = 26;
    const pair = `0x${log.data.slice(offset, offset + ADDRESS_LENGTH)}`.toLowerCase();
    return pair;
}

export function parsePoolAddress(log: Log) {
    const pair = `0x${log.data.slice(-ADDRESS_LENGTH)}`.toLowerCase();
    return pair;
}

export function parseTokenAddresses(log: Log): [string, string] {
    const [_, token1Topic, token2Topic] = log.topics;
    const token1Addr = extractAddress(token1Topic);
    const token2Addr = extractAddress(token2Topic);
    return [token1Addr, token2Addr];
}

export function parseTransfer(log: Log): {
    from: string,
    to: string,
    amount: BigNumberish,
} {
    const [from, to] = parseTokenAddresses(log);
    const amount = BigInt(log.data);
    return {
        from,
        to,
        amount,
    };
}

export function extractAddress(topic: string): string {
    return `0x${topic.slice(-ADDRESS_LENGTH)}`.toLowerCase();
}
