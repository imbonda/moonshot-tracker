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
}

export function throttle(
    { delayMs, maxConcurrent }: ThrottleOptions,
) {
    return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value!;
        const limiter = new Bottleneck({ minTime: delayMs, maxConcurrent });
        const wrapped = limiter.wrap(originalMethod);
        descriptor.value = wrapped;
        return descriptor;
    };
}

export function safe(
    { defaultValue } = { defaultValue: null },
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
                (this as { logger: Logger })?.logger.error(err);
                return defaultValue;
            }

            if (result.then) {
                return result.catch((err: Error) => {
                    (this as { logger: Logger })?.logger.error(err);
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
            return await originalMethod.apply(this, args);
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
