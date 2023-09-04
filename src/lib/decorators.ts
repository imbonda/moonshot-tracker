// 3rd party.
import Bottleneck from 'bottleneck';

export function throttle(
    { delayMs, maxConcurrent }: {delayMs: number, maxConcurrent?: number},
) {
    return (
        _target: any,
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
