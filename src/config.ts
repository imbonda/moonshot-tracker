// Builtin.
import path from 'path';
// 3rd party.
import dotenv from 'dotenv';

export const nodeEnv = process.env.NODE_ENV?.toLowerCase();

// Load dotenv variables.
const dotEnvFilename = () => '.env';
dotenv.config({ path: path.join(__dirname, '..', '..', dotEnvFilename()) });

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
    MONGO_URI: process.env.MONGO_URI as string,
};

/**
 * Web3.
 */
export const web3Config = {
    RPC_ENDPOINT: process.env.RPC_ENDPOINT as string,
};

/**
 * Inter-process communication protocols.
 */
export const ipcConfig = {
    mq: {
        URI: process.env.MQ_URI as string,
        EXCHANGE: process.env.MQ_EXCHANGE as string,
    },
    pubsub: {
        URI: process.env.PUBSUB_URI as string,
        TOKEN_EVENTS: process.env.PUBSUB_TOKEN_EVENTS as string,
    },
    rpc: {
        URI: process.env.RPC_URI as string,
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

function validateSubConfig(subConfig: { [key: string]: unknown }) {
    Object.entries(subConfig).forEach(([key, value]) => {
        if (value === undefined) {
            throw new Error(`Missing configuration for ${key}`);
        }
    });
}

export function validateConfig() {
    const configurations = [
        envConfig,
        dbConfig,
        logConfig,
        web3Config,
    ];

    configurations.forEach(validateSubConfig);
}
