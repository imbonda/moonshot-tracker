/* eslint-disable max-classes-per-file */
// Builtin.
import process from 'process';
// 3rd party.
import {
    createLogger, config, format, transports, Logger as WinstonLogger,
} from 'winston';
// Internal.
import { logConfig } from '../config';
import { isEmpty } from './utils';

const loggerConfig = {
    level: 'info',
    levels: {
        ...config.npm.levels,
        notice: config.npm.levels.error,
    },
    format: format.combine(
        format.errors({ stack: true }),
        format.timestamp(),
        format.json(),
        format.prettyPrint(),

    ),
    transports: [
        new transports.Console({
            format: format.printf(
                ({
                    level, message, timestamp, loggerName, err, stack, ...meta
                }) => {
                    let metaStr;
                    try {
                        metaStr = isEmpty(meta) ? '' : ` ${JSON.stringify(meta)}`;
                    } catch (_err) {
                        metaStr = '';
                    }
                    const stackTrace = (err?.stack ?? stack) ? `\r\n${err?.stack ?? stack}` : '';
                    return `[${level.toUpperCase()}] ${timestamp} [${process.pid}]: [${loggerName}] ${message}${metaStr}${stackTrace}`;
                },
            ),
            handleExceptions: true,
            level: logConfig.LEVEL,
            silent: logConfig.SILENT,
        }),
    ],
};

const baseLogger: WinstonLogger = createLogger(loggerConfig);

const LoggerClass = (): new () => WinstonLogger => (class {} as never);

export class Logger extends LoggerClass() {
    private _logger;

    // Define a handler that forwards all calls to underlying logger.
    private handler = {
        get(target: Logger, prop: string, receiver: unknown) {
            return Reflect.get(target._logger, prop, receiver);
        },
    };

    constructor(name: string) {
        super();
        this._logger = baseLogger.child({ loggerName: name });
        return new Proxy(this, this.handler);
    }
}
