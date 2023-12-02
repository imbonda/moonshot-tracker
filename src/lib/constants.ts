export enum ChainId {
    ETH = 1,
    BSC = 56,
    POLYGON = 137,
    FTM = 250,
}
export const CHAIN_IDS = Object.values(ChainId).filter(Number.isFinite);

export const HEX_NONE = '0x';
export const HEX_NULL = '0x0';

export const MS_IN_SECOND = 1000;
