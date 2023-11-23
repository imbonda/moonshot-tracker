// 3rd party.
import Bottleneck from 'bottleneck';
// Internal.
import type { Logger } from './logger';
import { RawRpcError, rpcErrorFactory } from './errors/rpc';
import { httpErrorFactory } from './errors/http';
import { RawNetworkingError } from './errors/networking-error';

interface ThrottleOptions {
    delayMs?: number,
    maxConcurrent?: number,
    discard?: boolean,
}

export function throttle(
    { delayMs, maxConcurrent, discard }: ThrottleOptions,
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        const limiter = new Bottleneck({
            minTime: delayMs,
            maxConcurrent,
            ...(discard && {
                highWater: 0,
                strategy: Bottleneck.strategy.OVERFLOW,
            }),
        });
        const wrapped = limiter.wrap(originalMethod);
        descriptor.value = wrapped;
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
