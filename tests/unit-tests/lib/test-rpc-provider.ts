// Builtin.
import assert from 'assert';
// Internal.
import { Web3RpcProvider } from '../../../src/lib/adapters/rpc-provider';
import { ChainId } from '../../../src/lib/constants';

describe('Web3RpcProvider', () => {
    const ethProvider = new Web3RpcProvider(ChainId.ETH);
    const bscProvider = new Web3RpcProvider(ChainId.BSC);

    describe('getTransactionReceipts', () => {
        it('should get latest block transaction receipts', async () => {
            const receipts = await ethProvider.getTransactionReceipts('latest');
            assert(!!receipts?.length);
        });
    });

    describe('getERC20', () => {
        it('should get stETH contract data on ETH', async () => {
            const STETH_ADDRESS = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';
            const erc20 = await ethProvider.getERC20(STETH_ADDRESS);
            assert(!!erc20);
            const {
                chainId,
                address,
                symbol,
                decimals,
                totalSupply,
            } = erc20;
            assert.equal(chainId, ethProvider.chainId);
            assert.equal(address, STETH_ADDRESS);
            assert.equal(symbol, 'stETH');
            assert.equal(decimals, 18);
            assert(!!totalSupply);
        });

        it('should get BSC-USD contract data on BSC', async () => {
            const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
            const erc20 = await bscProvider.getERC20(USDT_ADDRESS);
            assert(!!erc20);
            const {
                chainId,
                address,
                symbol,
                decimals,
                totalSupply,
            } = erc20;
            assert.equal(chainId, bscProvider.chainId);
            assert.equal(address, USDT_ADDRESS);
            assert.equal(symbol, 'USDT');
            assert.equal(decimals, 18);
            assert(!!totalSupply);
        });

        it('should get null for non erc20 contract', async () => {
            const UNISWAP_ROUTER_ADDRESS = '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad';
            const EOA_ADDRESS = '0x74ae0804797a26eead43485c6ce560d37151bda9';
            const [res1, res2] = await Promise.all([
                await ethProvider.getERC20(UNISWAP_ROUTER_ADDRESS),
                await ethProvider.getERC20(EOA_ADDRESS),
            ]);
            assert.equal(res1, null);
            assert.equal(res2, null);
        });
    });
});
