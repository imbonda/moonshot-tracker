// 3rd party.
import Bottleneck from 'bottleneck';
// Internal.
import type { Logger } from './logger';

export function throttle(
    { delayMs, maxConcurrent }: {delayMs: number, maxConcurrent?: number},
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
        descriptor.value = async function wrapper(...args: unknown[]) {
            try {
                return await originalMethod.apply(this, args);
            } catch (err) {
                (this as { logger: Logger })?.logger.error(err);
                return defaultValue;
            }
        };
        return descriptor;
    };
}
