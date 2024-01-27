// Internal.
import type { Modify, WithRequired, valueof } from './generics';

export type AuditProvider = 'goplus' | 'hapi' | 'quickintel' | 'tokensniffer' | 'dextools' | 'honeypotis';

export type RiskLevel = 'low' | 'medium' | 'high' | string;

export interface TokenSnifferAuditTest {
    id: string | 'testForInadequateInitialLiquidity' | 'testForInadeqateLiquidityLockedOrBurned',
    description: string,
    // true iff identified an inadequate state or condition.
    result: boolean,
    value?: number,
    valuePct?: number,
}

export interface RawAudit {
    anti_whale_modifiable?: string | number | boolean,
    buy_tax?: number,
    can_take_back_ownership?: string | number | boolean,
    cannot_buy?: string | number | boolean,
    cannot_sell_all?: string | number | boolean,
    creator_balance?: number,
    creator_percent?: number,
    external_call?: string | number | boolean,
    hidden_owner?: string | number | boolean,
    holder_count?: number,
    honeypot_with_same_creator?: string | number | boolean,
    is_anti_whale?: string | number | boolean,
    is_blacklisted?: string | number | boolean,
    is_honeypot?: string | number | boolean,
    is_in_dex?: string | number | boolean,
    is_mintable?: string | number | boolean,
    is_open_source?: string | number | boolean,
    is_proxy?: string | number | boolean,
    is_whitelisted?: string | number | boolean,
    is_potentially_scam?: string | number | boolean,
    lp_holder_count?: number,
    lp_total_supply?: number,
    owner_balance?: number,
    owner_change_balance?: string | number | boolean,
    owner_percent?: number,
    personal_slippage_modifiable?: string | number | boolean,
    selfdestruct?: string | number | boolean,
    sell_tax?: number,
    slippage_modifiable?: string | number | boolean,
    status?: string | number | boolean,
    total_supply?: number,
    trading_cooldown?: string | number | boolean,
    transfer_pausable?: string | number | boolean,
    trust_list?: string | number | boolean,
    tests?: TokenSnifferAuditTest[],
    riskLevel?: RiskLevel,
    updatedResult?: boolean,
}

export type RawExternalTokenAudits = { createdAt: string } & {
    [key in AuditProvider]?: RawAudit;
}

export interface RawTokenAudit {
    provider: string,
    date: string,
    codeVerified: boolean,
    is_contract_renounced: boolean,
    lockTransactions: boolean,
    unlimitedFeed: boolean,
    mint: boolean,
    external?: RawExternalTokenAudits,
}

export interface RawPairData {
    creationTime: string,
    dextScore: {
        creation: number,
        holders: number,
        information: number,
        pool: number,
        total: number,
        transactions: number,
    },
    id: {
        chain: string,
        exchange: string,
        pair: string,
        token: string,
        tokenRef: string,
    }
    metrics: {
        liquidity: number,
        liquidityUpdatedAt: string,
        reserve: number,
        reserveRef: number,
    },
    token: {
        creationBlock: number,
        creationTime: string,
        decimals: number,
        symbol: string,
        name: string,
        links: {
            reddit: string,
            telegram: string,
            twitter: string,
            website: string,
        },
        metrics: {
            circulationSupply: number,
            fdv: number,
            mcap: number,
            tmcap: number,
            holders: number,
            txCount: number,
            holdersUpdatedAt: string,
            totalSupplyUpdatedAt: string,
            updatedAt: string,
        },
        audit?: RawTokenAudit,
    },
    votes: {
        _warning: number,
        downvotes: number,
        upvotes: number,
    }
    fee: number,
    swaps: number,
    price: number,
    volume: number,
}

export type RawFullyAuditedPairData = Modify<RawPairData, {
    token: Modify<RawPairData['token'], {
        audit?: WithRequired<RawTokenAudit, 'external'>,
    }>,
}>

export interface TopTokenPairsResponse {
    info: {
        count: number,
        countTotal: number,
    },
    results: RawPairData[],
}

export interface TokenPairResponse {
    code: 'OK' | 'ERROR',
    data: RawFullyAuditedPairData[],
    error?: {
        type?: 'ERROR',
        desc?: string,
    }
}

/**
 * Parsed.
 */

export type TaxValueRange = {
    min: number,
    max: number,
    status: 'clear' | 'warning' | string,
};

export interface Audit {
    is_open_source?: boolean,
    is_honeypot?: boolean,
    is_proxy?: boolean,
    is_potentially_scam?: boolean,
    buy_tax?: number | TaxValueRange,
    sell_tax?: number | TaxValueRange,
    owner_percent?: number,
    creator_percent?: number,
    riskLevel?: RiskLevel,
}

export interface EnrichedAudit extends Audit {
    initial_liquidity_percent?: number,
    liquidity_locked_or_burned_percent?: number,
}

export type ExternalTokenAudits = { createdAt: Date } & {
    [key in AuditProvider]?: EnrichedAudit;
}

export type TokenAudit = Modify<RawTokenAudit, {
    date: Date,
    external?: ExternalTokenAudits,
}>

export type PairData = Modify<RawPairData, {
    creationTime: Date,
    id: Modify<Omit<RawPairData['id'], 'chain'>, {
        chainId: number,
    }>,
    metrics: Modify<RawPairData['metrics'], {
        liquidityUpdatedAt: Date,
    }>,
    token: Modify<RawPairData['token'], {
        creationTime: Date,
        metrics: Modify<RawPairData['token']['metrics'], {
            holdersUpdatedAt: Date,
            totalSupplyUpdatedAt: Date,
            updatedAt: Date,
        }>,
        audit?: TokenAudit,
    }>,
}>

export type FullyAuditedPairData = Modify<PairData, {
    token: Modify<PairData['token'], {
        audit?: WithRequired<TokenAudit, 'external'>,
    }>,
}>

export interface DexToolsTokenInsights {
    audit: FullyAuditedPairData['token']['audit'],
    metrics: PairData['token']['metrics'],
    links: PairData['token']['links'],
    properties: Pick<PairData['token'], 'decimals' | 'symbol' | 'name'>,
    topPair: {
        id: PairData['id'],
        dextScore: PairData['dextScore'],
        metrics: PairData['metrics'],
        votes: PairData['votes'],
        fee: PairData['fee'],
        swaps: PairData['swaps'],
        price: PairData['price'],
        volume: PairData['volume'],
        url: string,
    },
}

export type AuditMatrix = {
    [check in keyof EnrichedAudit]: {
        [provider in AuditProvider]: EnrichedAudit[check]
    }
};

export type RedFlags = Record<keyof AuditMatrix, valueof<AuditMatrix>>;
