// 3rd party.
import { trace, type Tracer } from '@opentelemetry/api';
// Internal.
import { Logger } from '../lib/logger';

export abstract class Service {
    protected logger: Logger;

    protected tracer: Tracer;

    constructor() {
        this.logger = new Logger(this.constructor.name);
        this.tracer = trace.getTracer(this.constructor.name);
    }

    abstract setup(): Promise<void>;

    abstract teardown(): Promise<void>;

    abstract start(): Promise<void>;
}

export interface ServiceClass {
    new(): Service;
}
