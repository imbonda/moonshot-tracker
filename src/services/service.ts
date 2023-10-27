// Internal.
import { Logger } from '../lib/logger';

export abstract class Service {
    protected logger: Logger;

    constructor() {
        this.logger = new Logger(this.constructor.name);
    }

    abstract setup(): Promise<void>;

    abstract teardown(): Promise<void>;

    abstract start(): Promise<void>;
}

export interface ServiceClass {
    new(): Service;
}
