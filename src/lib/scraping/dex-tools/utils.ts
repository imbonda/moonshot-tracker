// Internal.
import { ChainId } from '../../constants';
import type {
    Audit,
    RawPairData, PairData,
    RawFullyAuditedPairData, FullyAuditedPairData,
} from './types';

export function buildGetTopTokenPairsUrl(token: string): string {
    return `https://www.dextools.io/shared/search/pair?query=${token}`;
}

export function buildGetPairUrl(chainId: number, pair: string): string {
    const chain = resolveChain(chainId);
    return `https://www.dextools.io/shared/data/pair?address=${pair}&chain=${chain}&audit=true&locks=true`;
}

export function resolveChain(chainId: number): string {
    switch (chainId) {
        case ChainId.ETH:
            return 'ether';
        default:
            return '';
    }
}

export function resolveChainId(chain: string): number | undefined {
    switch (chain) {
        case 'ether':
            return ChainId.ETH;
        default:
            return undefined;
    }
}

export function parseTokenPair(
    rawPair: RawPairData,
): PairData {
    const {
        creationTime, dextScore, id, metrics, votes, token, fee, swaps, price, volume,
    } = rawPair;
    return {
        creationTime: new Date(creationTime),
        dextScore,
        id: {
            chainId: resolveChainId(id.chain) as number,
            exchange: id.exchange,
            pair: id.pair,
            token: id.token,
            tokenRef: id.tokenRef,
        },
        metrics: {
            ...metrics,
            liquidityUpdatedAt: new Date(metrics.liquidityUpdatedAt),
        },
        token: parseToken(token),
        votes,
        fee,
        swaps,
        price,
        volume,
    };
}

export function parseToken(
    rawToken: RawPairData['token'],
): PairData['token'] {
    const {
        creationTime, metrics, audit,
    } = rawToken;
    return {
        creationTime: new Date(creationTime),
        metrics: {
            ...rawToken.metrics,
            holdersUpdatedAt: new Date(metrics.holdersUpdatedAt),
            totalSupplyUpdatedAt: new Date(metrics.totalSupplyUpdatedAt),
            updatedAt: new Date(metrics.updatedAt),
        },
        audit: parseTokenAudit(audit),
    } as never;
}

export function parseTokenAudit(
    rawAudit: RawPairData['token']['audit'],
): PairData['token']['audit'] {
    const parsedAudit = {
        ...rawAudit,
        date: new Date(rawAudit.date),
        ...((!!rawAudit.external!) && {
            external: parseExternalTokenAudits(rawAudit.external),
        }),
    };
    return parsedAudit;
}

export function parseExternalTokenAudits(
    rawExternal: RawFullyAuditedPairData['token']['audit']['external'],
): FullyAuditedPairData['token']['audit']['external'] {
    const { createdAt, ...externalAudits } = rawExternal!;

    const positiveValues = [true, 'Yes', '1'];
    const negativeValues = [false, 'No', '0'];
    const auditChecks: (keyof Audit)[] = [
        'is_open_source',
        'is_honeypot',
        'creator_percent',
    ];
    const external = Object.fromEntries(
        Object.entries(externalAudits ?? []).map(([provider, audit]) => {
            const parsedAudit = auditChecks.reduce((accum, check) => {
                const value = audit[check];
                if (positiveValues.includes(value as string | boolean)) {
                    (accum[check] as boolean) = true;
                }
                if (negativeValues.includes(value as string | boolean)) {
                    (accum[check] as boolean) = false;
                }
                if (typeof value === 'number') {
                    (accum[check] as number) = value;
                }
                return accum;
            }, {} as Audit);
            return [provider, parsedAudit];
        }),
    );

    return {
        createdAt: new Date(createdAt),
        ...external,
    };
}
