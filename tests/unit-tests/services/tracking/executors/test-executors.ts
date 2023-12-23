// Internal.
import { testTaskExecutor } from './test-task-executor';
import { testStageExecutor } from './test-stage-executor';

describe('Executors', () => {
    describe('StageExecutor', testStageExecutor.bind(this));

    describe('TaskExecutor', testTaskExecutor.bind(this));
});
