// 3rd party.
import { Contract, type TransactionReceipt } from 'ethers';
// Internal.
import erc20ABI from '../../abi/erc20.json';
import { web3Config } from '../../config';
import { safe, throttle } from '../../lib/decorators';
import { dal } from '../../dal/dal';
import { Web3RpcProvider } from '../../lib/adapters/rpc-provider';
import { hexifyNumber } from '../../lib/utils';
import { Service } from '../service';

export class TokenContractCreationMonitor extends Service {
    private chainId: number;

    private provider: Web3RpcProvider;

    constructor() {
        super();
        this.chainId = web3Config.CHAIN_ID;
        this.provider = new Web3RpcProvider(this.chainId);
    }

    // eslint-disable-next-line class-methods-use-this
    public async setup(): Promise<void> {
        await dal.connect();
    }

    // eslint-disable-next-line class-methods-use-this
    public async teardown(): Promise<void> {
        await dal.disconnect();
    }

    public async start(): Promise<void> {
        this.monitor();
    }

    private monitor(): void {
        this.monitorNewERC20Creation();
    }

    private monitorNewERC20Creation(): void {
        // Monitor all contract creations
        this.provider.on('block', this.processBlock.bind(this));
    }

    @safe()
    private async processBlock(blockNumber: number) {
        const hexBlockNumber = hexifyNumber(blockNumber);
        const receipts = await this.provider.getTransactionReceipts(hexBlockNumber);
        if (!receipts) {
            return;
        }

        await Promise.all(
            receipts.map(this.processERC20Creation.bind(this)),
        );
    }

    @throttle({ delayMs: 10, maxConcurrent: 5 })
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

        const tokenAddr = receipt.contractAddress;
        const contract = new Contract(
            tokenAddr,
            erc20ABI,
            this.provider,
        );

        try {
            const symbol = await contract.symbol();
            if (symbol) {
                await dal.models.newErc20.saveNewERC20(this.chainId, tokenAddr);
                this.logger.info('New ERC20 token', { address: tokenAddr });
            }
        } catch (err) {
            // Not an ERC-20 token.
        }
    }
}
