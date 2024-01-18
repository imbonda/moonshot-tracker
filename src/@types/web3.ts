// 3rd party.
import type { BigNumberish } from 'ethers';

export interface ERC20 {
    chainId: number,
    address: string,
    symbol: string,
    decimals: number,
    totalSupply: BigNumberish,
}
