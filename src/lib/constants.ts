export enum ChainId {
    ETH = 1,
    BSC = 56,
    POLYGON = 137,
    FTM = 250,
}
export const CHAIN_IDS: number[] = Object.values(ChainId).filter(Number.isFinite) as ChainId[];
export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
    CHAIN_IDS.map((id) => [id, ChainId[id].toLowerCase()]),
);

export const HEX_NONE = '0x';
export const HEX_NULL = '0x0';

export const MS_IN_SECOND = 1000;
