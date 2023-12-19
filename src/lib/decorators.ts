// 3rd party.
import Bottleneck from 'bottleneck';
import pLimit from 'p-limit';
// Internal.
import type { Logger } from './logger';
import { RawRpcError, rpcErrorFactory } from './errors/rpc';
import { httpErrorFactory } from './errors/http';
import { RawNetworkingError } from './errors/networking-error';

interface ThrottleOptions {
    maxConcurrent?: number,
    maxInTimeFrame?: number,
    delayMs?: number,
    queueSize?: number,
}

export function throttle(
    {
        maxConcurrent, maxInTimeFrame, delayMs, queueSize,
    }: ThrottleOptions,
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        const limiter = new Bottleneck({
            maxConcurrent,
            minTime: delayMs,
            ...((maxInTimeFrame !== undefined) && {
                reservoir: maxInTimeFrame,
                reservoirRefreshAmount: maxInTimeFrame,
                reservoirRefreshInterval: delayMs,
            }),
            ...((queueSize !== undefined) && {
                highWater: queueSize,
                strategy: Bottleneck.strategy.OVERFLOW,
            }),
        });
        const wrapped = limiter.wrap(originalMethod);
        descriptor.value = wrapped;
        return descriptor;
    };
}

export function promiselimit(maxConcurrent: number) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        const limit = pLimit(maxConcurrent);
        descriptor.value = function wrapper(...args: unknown[]) {
            return limit(() => originalMethod.apply(this, args));
        };
        return descriptor;
    };
}

interface SafeOptions {
    defaultValue?: unknown,
    silent?: boolean,
}

export function safe(
    { defaultValue, silent }: SafeOptions = {},
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        descriptor.value = function wrapper(...args: unknown[]) {
            let result;

            try {
                result = originalMethod.apply(this, args);
            } catch (err) {
                if (!silent) {
                    (this as { logger: Logger })?.logger.error(err);
                }
                return defaultValue;
            }

            if (result.then) {
                return result.catch((err: Error) => {
                    if (!silent) {
                        (this as { logger: Logger })?.logger.error(err);
                    }
                    return defaultValue;
                });
            }

            return result;
        };
        return descriptor;
    };
}

export function wrapRpcError(
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const originalMethod = descriptor.value!;
    descriptor.value = async function wrapper(...args: unknown[]) {
        try {
            const result = await originalMethod.apply(this, args);
            return result;
        } catch (err) {
            throw rpcErrorFactory(err as RawRpcError);
        }
    };
    return descriptor;
}

export function wrapHttpError(
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const originalMethod = descriptor.value!;
    descriptor.value = async function wrapper(...args: unknown[]) {
        try {
            return await originalMethod.apply(this, args);
        } catch (err) {
            throw httpErrorFactory(err as RawNetworkingError);
        }
    };
    return descriptor;
}
