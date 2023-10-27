// Builtin.
import path from 'path';
// 3rd party.
import dotenv from 'dotenv';
// Internal.
import { ChainId } from './lib/constants';

export const nodeEnv = process.env.NODE_ENV?.toLowerCase();

// Load dotenv variables.
const dotEnvFilename = () => '.env';
dotenv.config({ path: path.join(__dirname, '..', dotEnvFilename()) });

/**
 * Mode.
 */
export const envConfig = {
    IS_DEBUG: nodeEnv === 'debug',
    IS_PROD: nodeEnv === 'production',
};

/**
 * DB.
 */
export const dbConfig = {
    MONGO_URL: process.env.MONGO_URL as string,
    REDIS_URL: process.env.REDIS_URL as string,
};

/**
 * Web3.
 */
export const web3Config = {
    CHAIN_ID: parseInt(process.env.CHAIN_ID as string),
    RPC_CONFIG_BY_CHAIN: Object.fromEntries(
        Object.values(ChainId).map((chainId) => [
            chainId,
            {
                endpoints: JSON.parse(process.env[`${chainId}_RPC_ENDPOINTS`] ?? process.env.RPC_ENDPOINTS ?? '[]'),
                pollingInterval: parseInt(process.env[`${chainId}_RPC_POLLING_INTERVAL_MS`] ?? process.env.RPC_POLLING_INTERVAL_MS ?? '4000'),
                isAlchemy: (process.env[`${chainId}_RPC_IS_ALCHEMY`] ?? process.env.RPC_IS_ALCHEMY) === 'true',
            },
        ]),
    ),
};

/**
 * Inter-process communication protocols.
 */
export const ipcConfig = {
    mq: {
        URL: process.env.MQ_URL as string,
        EXCHANGE: process.env.MQ_EXCHANGE as string,
        TRACKING_QUEUE: process.env.MQ_TRACKING_QUEUE as string,
    },
    pubsub: {
        URL: process.env.PUBSUB_URL as string,
        TOKEN_EVENTS: process.env.PUBSUB_TOKEN_EVENTS as string,
    },
    rpc: {
        URL: process.env.RPC_URL as string,
    },
};

/**
 * Log.
 */
export const logConfig = {
    SILENT: process.env.LOGGER_SILENT?.toLocaleLowerCase() === 'true',
    LEVEL: process.env.LOGGER_LEVEL?.toLocaleLowerCase() ?? 'debug',
};

/**
 * Opentelemetry.
 */
export const opentelemetryConfig = {
    EXPORTER_API_KEY: process.env.OTEL_EXPORTER_API_KEY as string,
    EXPORTER_API_KEY_NAME: process.env.OTEL_EXPORTER_API_KEY_NAME as string,
    EXPORTER_TRACES_ENDPOINT: process.env.OTEL_EXPORTER_TRACES_ENDPOINT as string,
    SAMPLE_RATE: parseInt(process.env.OTEL_SAMPLE_RATE ?? '1'),
};

function validateSubConfig(subConfig: Record<string, unknown>) {
    Object.entries(subConfig).forEach(([key, value]) => {
        if (value === undefined) {
            throw new Error(`Missing configuration for ${key}`);
        }
    });
}

export function validateConfigs(configs: Record<string, unknown>[]) {
    configs.forEach(validateSubConfig);
}
