// Internal.
import { ChainId } from '../../constants';
import type {
    Audit, EnrichedAudit,
    RawPairData, PairData,
    RawFullyAuditedPairData, FullyAuditedPairData,
} from '../../../@types/dex-tools';

export function buildGetTopTokenPairsUrl(token: string): string {
    return `https://www.dextools.io/shared/search/pair?query=${token}`;
}

export function buildGetPairUrl(chainId: number, pair: string): string {
    const chain = resolveChain(chainId);
    return `https://www.dextools.io/shared/data/pair?address=${pair}&chain=${chain}&audit=true&locks=true`;
}

export function resolveChain(chainId: number, direct: boolean = true): string {
    switch (chainId) {
        case ChainId.ETH:
            return 'ether';
        case ChainId.BSC:
            return direct ? 'bsc' : 'bnb';
        default:
            return '';
    }
}

export function resolveChainId(chain: string): number | undefined {
    switch (chain) {
        case 'ether':
            return ChainId.ETH;
        case 'bsc':
            return ChainId.BSC;
        default:
            return undefined;
    }
}

export enum AudicCheck {
    CONTRACT_VERIFIED = 'is_open_source',
    HONEYPOT = 'is_honeypot',
    BUY_TAX = 'buy_tax',
    SELL_TAX = 'sell_tax',
    PROXY = 'is_proxy',
    OWNER_PERCENT = 'owner_percent',
    CREATOR_PERCENT = 'creator_percent',
}

export const AUDIT_CHECKS: (keyof Audit)[] = Object.values(AudicCheck);

export function parseTokenPair(
    rawPair: RawPairData,
): PairData {
    const {
        creationTime, dextScore, id, metrics, votes, token, fee, swaps, price, volume,
    } = rawPair;
    return {
        creationTime: new Date(creationTime),
        dextScore,
        ...(!!id && {
            id: {
                chainId: resolveChainId(id.chain) as number,
                exchange: id.exchange,
                pair: id.pair,
                token: id.token,
                tokenRef: id.tokenRef,
            },
        }),
        ...(!!metrics && {
            metrics: {
                ...metrics,
                liquidityUpdatedAt: new Date(metrics.liquidityUpdatedAt),
            },
        }),
        ...(!!token && {
            token: parseToken(token),
        }),
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
        creationBlock, creationTime,
        audit, metrics, links,
        decimals, symbol, name,
    } = rawToken;
    return {
        creationBlock,
        creationTime: new Date(creationTime),
        audit: parseTokenAudit(audit),
        links,
        ...(!!metrics && {
            metrics: {
                ...metrics,
                holdersUpdatedAt: new Date(metrics.holdersUpdatedAt),
                totalSupplyUpdatedAt: new Date(metrics.totalSupplyUpdatedAt),
                updatedAt: new Date(metrics.updatedAt),
            },
        }),
        decimals,
        symbol,
        name,
    };
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

    const positiveValues = [true, 'Yes', 'yes', '1'];
    const negativeValues = [false, 'No', 'no', '0'];
    const auditChecks = AUDIT_CHECKS;

    const external = Object.fromEntries(
        Object.entries(externalAudits ?? []).map(([provider, audit]) => {
            const parsedAudit = auditChecks.reduce((accum, check) => {
                const value = audit[check];
                if (value === undefined) {
                    return accum;
                }
                if (positiveValues.includes(value as string | boolean)) {
                    (accum[check] as boolean) = true;
                    return accum;
                }
                if (negativeValues.includes(value as string | boolean)) {
                    (accum[check] as boolean) = false;
                    return accum;
                }
                if (typeof value === 'number') {
                    (accum[check] as number) = value;
                    return accum;
                }
                (accum[check] as unknown) = value;
                return accum;
            }, {} as Audit);

            if (provider === 'tokensniffer') {
                Object.assign(parsedAudit, parseTokenSnifferAudit(audit));
            }

            return [provider, parsedAudit];
        }),
    );

    return {
        createdAt: new Date(createdAt),
        ...external,
    };
}

export function parseTokenSnifferAudit(
    rawTokenSnifferAudit: RawFullyAuditedPairData['token']['audit']['external']['tokensniffer'],
): FullyAuditedPairData['token']['audit']['external']['tokensniffer'] {
    const audit = (rawTokenSnifferAudit?.tests ?? []).reduce((accum, test) => {
        switch (test.id) {
            case 'testForInadequateInitialLiquidity':
                accum.initial_liquidity_percent = test.valuePct;
                break;
            case 'testForInadeqateLiquidityLockedOrBurned':
                accum.liquidity_locked_or_burned_percent = test.valuePct;
                break;
            default:
                break;
        }
        return accum;
    }, {} as EnrichedAudit);
    return audit;
}
