// Internal.
import { Logger } from '../src/lib/logger';

export const mochaHooks = {
    beforeAll() {
        // Silence logging.
        new Logger('').pause();
    },
};
