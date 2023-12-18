// Internal.
import { Logger } from '../../../../../src/lib/logger';
import { testTaskExecutor } from './test-task-executor';
import { testStageExecutor } from './test-stage-executor';

describe('Executors', () => {
    before(() => {
        // TODO: should have mocha root hooks.
        // Silence logging.
        new Logger('').pause();
    });

    describe('StageExecutor', testStageExecutor.bind(this));

    describe('TaskExecutor', testTaskExecutor.bind(this));
});
