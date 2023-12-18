// Internal.
import { TaskExecutor } from '../../../../../src/services/tracking/executors/task';

export class DummyTaskExecutor extends TaskExecutor {
    // eslint-disable-next-line class-methods-use-this, no-empty-function
    public async run(): Promise<void> {}

    public completeTask(): void {
        this.setCompleted();
    }
}
