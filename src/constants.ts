import uniswapV2PairABI from './abi/uniswap-v2-pair.json';
import uniswapV2FactoryABI from './abi/uniswap-v2-factory.json';
import uniswapV3FactoryABI from './abi/uniswap-v3-factory.json';
import uniswapV3PoolABI from './abi/uniswap-v3-pool.json';

export enum FactoryTypes {
    v1 = 'v1',
    v2 = 'v2',
    v3 = 'v3',
}

export enum Chains {
    Ethereum = '1',
    BSC = '56',
    Polygon = '137',
    Fantom = '250',
}

export enum Providers {
    Alchemy1 = 'alchemy1',
    Infura1 = 'infura1',
}

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com/v2/';

export const ProviderURLs = {
    [Providers.Alchemy1]: {
        [Chains.Ethereum]: `${ALCHEMY_URL}${process.env.ALCHEMY_API_KEY}`,
    },
};

export const ProvidersByChain = Object.entries(ProviderURLs).reduce((acc, [provider, chains]) => {
    Object.entries(chains).forEach(([chain, url]) => {
        const chainKey = chain as Chains;
        if (!acc[chainKey]) {
            acc[chainKey] = {};
        }
        const providerKey = provider as Providers;
        acc[chainKey][providerKey] = url;
    });
    return acc;
}, {} as { [key in Chains]: { [provider in Providers]?: string } });

export enum V2Factories {
    UniswapV2 = 'uniswapv2',
    SushiSwapV2 = 'sushiswapv2',
    PancakeSwapV2BSC = 'pancakeswapv2bsc',
    PancakeSwapV2ETH = 'pancakeswapv2eth',
    QuickSwap = 'quickswap',
    SpookySwap = 'spookyswap',
}

export enum V3Factories {
    UniswapV3 = 'uniswapv3',
}

export const FACTORIES = {
    [V3Factories.UniswapV3]: {
        name: 'Uniswap V3 Factory',
        id: V3Factories.UniswapV3,
        address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        chains: [Chains.Ethereum],
        type: FactoryTypes.v3,
        factoryABI: uniswapV3FactoryABI,
        lpABI: uniswapV3PoolABI,
    },
    [V2Factories.UniswapV2]: {
        name: 'Uniswap V2 Factory',
        id: V2Factories.UniswapV2,
        address: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        chains: [Chains.Ethereum],
        type: FactoryTypes.v2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2Factories.SushiSwapV2]: {
        name: 'SushiSwap V2 Factory',
        id: V2Factories.SushiSwapV2,
        address: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
        chains: [Chains.Ethereum],
        type: FactoryTypes.v2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2Factories.PancakeSwapV2BSC]: {
        name: 'PancakeSwap V2 Factory',
        id: V2Factories.PancakeSwapV2BSC,
        address: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        chains: [Chains.BSC],
        type: FactoryTypes.v2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2Factories.PancakeSwapV2ETH]: {
        name: 'PancakeSwap V2 Factory',
        id: V2Factories.PancakeSwapV2ETH,
        address: '0x1097053Fd2ea711dad45caCcc45EfF7548fCB362',
        chains: [Chains.Ethereum],
        type: FactoryTypes.v2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2Factories.QuickSwap]: {
        name: 'QuickSwap Factory',
        id: V2Factories.QuickSwap,
        address: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
        chains: [Chains.Polygon],
        type: FactoryTypes.v2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
    [V2Factories.SpookySwap]: {
        name: 'SpookySwap Factory',
        id: V2Factories.SpookySwap,
        address: '0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3',
        chains: [Chains.Fantom],
        type: FactoryTypes.v2,
        factoryABI: uniswapV2FactoryABI,
        lpABI: uniswapV2PairABI,
    },
};

export const DEAD_ADDRESSES = {
    '0x0000000000000000000000000000000000000000': true,
    '0x0000000000000000000000000000000000000001': true,
    '0x000000000000000000000000000000000000dEaD': true,
    '0x1111111111111111111111111111111111111111': true,
    '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': true,
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF': true,
};
