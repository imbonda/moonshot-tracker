// Builtin.
import path from 'path';
// 3rd party.
import dotenv from 'dotenv';
// Internal.
import { CHAIN_IDS } from './lib/constants';

export const nodeEnv = process.env.NODE_ENV?.toLowerCase();

// Load dotenv variables.
const dotEnvFilename = () => '.env';
dotenv.config({ path: path.join(__dirname, '..', dotEnvFilename()) });

/**
 * Mode.
 */
export const envConfig = {
    IS_DEV: nodeEnv === 'dev',
    IS_PROD: nodeEnv === 'prod',
};

/**
 * DB.
 */
export const dbConfig = {
    MONGO_URL: process.env.MONGO_URL!,
    REDIS_URL: process.env.REDIS_URL!,
};

/**
 * Web3.
 */
export const web3Config = {
    CHAIN_ID: parseInt(process.env.CHAIN_ID!),
    RPC_CONFIG_BY_CHAIN: Object.fromEntries(
        CHAIN_IDS.map((chainId) => [
            chainId,
            {
                endpoints: JSON.parse(process.env[`${chainId}_RPC_ENDPOINTS`]! ?? '[]'),
                avgBlockTime: parseInt(process.env[`${chainId}_RPC_AVG_BLOCK_TIME_MS`]!),
                pollingInterval: parseInt(process.env[`${chainId}_RPC_POLLING_INTERVAL_MS`]!),
                isAlchemy: (process.env[`${chainId}_RPC_IS_ALCHEMY`]!) === 'true',
            },
        ]),
    ),
};

/**
 * Inter-process communication protocols.
 */
export const ipcConfig = {
    mq: {
        URL: process.env.MQ_URL!,
        EXCHANGE: process.env.MQ_EXCHANGE!,
        TRACKING_QUEUE: process.env.MQ_TRACKING_QUEUE!,
    },
    pubsub: {
        URL: process.env.PUBSUB_URL!,
        TOKEN_EVENTS: process.env.PUBSUB_TOKEN_EVENTS!,
    },
    rpc: {
        URL: process.env.RPC_URL!,
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
    EXPORTER_API_KEY: process.env.OTEL_EXPORTER_API_KEY!,
    EXPORTER_API_KEY_NAME: process.env.OTEL_EXPORTER_API_KEY_NAME!,
    EXPORTER_TRACES_ENDPOINT: process.env.OTEL_EXPORTER_TRACES_ENDPOINT!,
    SAMPLE_RATE: parseInt(process.env.OTEL_SAMPLE_RATE ?? '1'),
};

export const telegramConfig = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
    NOTIFICATIONS_CHAT_ID: process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID!,
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
