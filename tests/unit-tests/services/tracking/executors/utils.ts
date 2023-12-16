// Internal.
import type { TaskData, TrackedToken } from '../../../../../src/@types/tracking';
import { TaskExecutor } from '../../../../../src/services/tracking/executors/task';

export class DummyTaskExecutor extends TaskExecutor {
    constructor(...args: [TrackedToken, TaskData]) {
        super(...args);
        this.logger.pause();
    }

    // eslint-disable-next-line class-methods-use-this, no-empty-function
    public async run(): Promise<void> {}
}
