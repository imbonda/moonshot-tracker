// Internal.
import { Dal } from '../dal';

export abstract class BaseDalModule {
    protected dal: Dal;

    constructor(dal: Dal) {
        this.dal = dal;
    }
}
