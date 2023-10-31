// 3rd party.
import type { Log, TransactionReceipt } from 'ethers';
// Internal.
import type { ERC20 } from '../../../@types/web3';
import { dal } from '../../../dal/dal';
import { BaseProcessor } from './base';

const NEW_ERC20_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days.

export class ERC20ReceiptProcessor extends BaseProcessor {
    public async processReceipt(receipt: TransactionReceipt): Promise<void> {
        await this.processERC20Creation(receipt);
    }

    // eslint-disable-next-line class-methods-use-this
    protected async processLog(log: Log): Promise<void> {
        // No operation.
        await Promise.resolve();
    }

    private async processERC20Creation(receipt: TransactionReceipt): Promise<void> {
        if (!receipt) {
            return;
        }
        if (receipt.to !== null) {
            // No contract creation.
            return;
        }

        if (!receipt?.contractAddress) {
            return;
        }

        const tokenAddr = receipt.contractAddress.toLowerCase();
        const erc20 = await this.provider.getERC20(tokenAddr);
        if (erc20) {
            await this.saveNewERC20(erc20);
            this.logger.info('New ERC20 token', { address: tokenAddr });
        }
    }

    private async saveNewERC20(erc20: ERC20): Promise<void> {
        const ttl = NEW_ERC20_TTL_SECONDS;
        this.cache.saveNewERC20(erc20, ttl);
        await dal.models.newErc20.saveNewERC20(erc20, ttl);
    }
}
