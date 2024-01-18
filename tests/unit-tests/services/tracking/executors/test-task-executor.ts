// Builtin.
import assert from 'assert';
// 3rd party.
import { createSandbox, type SinonSandbox } from 'sinon';
// Internal.
import type { TaskData, TrackedToken } from '../../../../../src/@types/tracking';
import { MS_IN_SECOND } from '../../../../../src/lib/constants';
import { TaskState } from '../../../../../src/services/tracking/static';
import { DummyTaskExecutor } from './utils';

const token = { address: '0x12345' } as TrackedToken;

/**
 * To execute.
 */

const firstExecutionTaskData: TaskData = {
    taskId: 'first-execution',
    state: TaskState.ACTIVATED,
    active: true,
    repetitions: {
        count: 0,
        repeat: 2,
        interval: 60,
    },
};

const scheduledTaskData: TaskData = {
    taskId: 'scheduled',
    state: TaskState.ACTIVATED,
    active: true,
    repetitions: {
        count: 1,
        repeat: 2,
        interval: 60,
    },
};

const lazyTaskData: TaskData = {
    taskId: 'lazy',
    state: TaskState.ACTIVATED,
    active: true,
    repetitions: {
        count: 0,
        repeat: 3,
    },
};

const completedDaemonTaskData: TaskData = {
    taskId: 'daemon',
    state: TaskState.DONE,
    active: true,
    repetitions: {
        count: 6,
        repeat: 8,
        interval: 60,
    },
    daemon: true,
};

/**
 * Not to execute.
 */

const nonDaemonCompletedTaskData: TaskData = {
    taskId: 'completed',
    state: TaskState.DONE,
    active: false,
    repetitions: {
        count: 1,
        interval: 60,
    },
    daemon: false,
};

const lastRunCompletedDaemonTaskData: TaskData = {
    taskId: 'daemon',
    state: TaskState.DONE,
    active: true,
    repetitions: {
        count: 7,
        repeat: 8,
        interval: 60,
    },
    daemon: true,
};

const inactiveCompletedDaemonTaskData: TaskData = {
    taskId: 'daemon',
    state: TaskState.DONE,
    active: false,
    repetitions: {
        count: 8,
        repeat: 8,
        interval: 60,
    },
    daemon: true,
};

const pendingTaskData: TaskData = {
    taskId: 'pending',
    state: TaskState.PENDING,
    active: false,
    repetitions: {
        count: 0,
        interval: 60,
    },
};

const pendingDaemonTaskData: TaskData = {
    taskId: 'pending',
    state: TaskState.PENDING,
    active: false,
    repetitions: {
        count: 0,
        interval: 60,
    },
    daemon: true,
};

const nonScheduledTaskData: TaskData = {
    taskId: 'non-scheduled',
    state: TaskState.ACTIVATED,
    active: true,
    repetitions: {
        count: 0,
        repeat: 1,
        interval: 60,
    },
    scheduledExecutionTime: new Date(
        new Date().setDate(
            // Tomorrow.
            new Date().getDate() + 1,
        ),
    ),
};

const repeatLimitTaskData: TaskData = {
    taskId: 'limit',
    state: TaskState.ACTIVATED,
    active: true,
    repetitions: {
        count: 2,
        repeat: 2,
        interval: 0,
    },
    scheduledExecutionTime: new Date(),
};

const repeatLimitDaemonTaskData: TaskData = {
    taskId: 'daemon',
    state: TaskState.IN_PROGRESS,
    active: true,
    repetitions: {
        count: 65,
        repeat: 55,
        interval: 1000,
    },
    daemon: true,
};

const repeatLimitCompletedDaemonTaskData: TaskData = {
    taskId: 'daemon',
    state: TaskState.DONE,
    active: false,
    repetitions: {
        count: 7,
        repeat: 7,
        interval: 60,
    },
    daemon: true,
};

const expiredTaskData: TaskData = {
    taskId: 'expired',
    state: TaskState.ACTIVATED,
    active: true,
    repetitions: {
        count: 2,
        interval: 60,
        deadline: new Date(),
    },
    scheduledExecutionTime: new Date(),
};

export function testTaskExecutor() {
    describe('active', () => {
        it('should return true for an activated task', async () => {
            const task = new DummyTaskExecutor(token, firstExecutionTaskData);
            assert.equal(task.active, true);
        });

        it('should return true for a completed daemon task that is still active', async () => {
            const task = new DummyTaskExecutor(token, completedDaemonTaskData);
            assert.equal(task.active, true);
        });

        it('should return true for a completed daemon task that should run one last time', async () => {
            const task = new DummyTaskExecutor(token, lastRunCompletedDaemonTaskData);
            assert.equal(task.active, true);
        });

        it('should return false for a completed daemon task that is not active', async () => {
            const task = new DummyTaskExecutor(token, inactiveCompletedDaemonTaskData);
            assert.equal(task.active, false);
        });

        it('should return false for a pending task', async () => {
            const task = new DummyTaskExecutor(token, pendingTaskData);
            assert.equal(task.active, false);
        });

        it('should return false for a pending daemon task', async () => {
            const task = new DummyTaskExecutor(token, pendingDaemonTaskData);
            assert.equal(task.active, false);
        });
    });

    describe('shouldExecute', () => {
        it('should return true for a task that needs to be executed for the first time', async () => {
            const task = new DummyTaskExecutor(token, firstExecutionTaskData);
            assert.equal(task.shouldExecute, true);
        });

        it('should return true for a scheduled task', () => {
            const task = new DummyTaskExecutor(token, scheduledTaskData);
            assert.equal(task.shouldExecute, true);
        });

        it('should return true for a completed daemon task', () => {
            const task = new DummyTaskExecutor(token, completedDaemonTaskData);
            assert.equal(task.shouldExecute, true);
        });

        it('should return false for a non-daemon completed task', () => {
            const task = new DummyTaskExecutor(token, nonDaemonCompletedTaskData);
            assert.equal(task.shouldExecute, false);
        });

        it('should return false for a pending task', () => {
            const task = new DummyTaskExecutor(token, pendingTaskData);
            assert.equal(task.shouldExecute, false);
        });

        it('should return false for a non-scheduled task', () => {
            const task = new DummyTaskExecutor(token, nonScheduledTaskData);
            assert.equal(task.shouldExecute, false);
        });

        it('should return false for a task that reached repeat limit', () => {
            const task = new DummyTaskExecutor(token, repeatLimitTaskData);
            assert.equal(task.shouldExecute, false);
        });

        it('should return false for a daemon task that reached repeat limit', () => {
            const task = new DummyTaskExecutor(token, repeatLimitDaemonTaskData);
            assert.equal(task.shouldExecute, false);
        });

        it('should return false for a completed daemon task that reached repeat limit', () => {
            const task = new DummyTaskExecutor(token, repeatLimitCompletedDaemonTaskData);
            assert.equal(task.shouldExecute, false);
        });

        it('should return false for an expired task', () => {
            const task = new DummyTaskExecutor(token, expiredTaskData);
            assert.equal(task.shouldExecute, false);
        });
    });

    describe('execute', () => {
        let sandbox: SinonSandbox;

        beforeEach(() => {
            sandbox = createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it('should run task', async () => {
            const task = new DummyTaskExecutor(token, firstExecutionTaskData);
            sandbox.stub(task, 'shouldExecute').value(true);
            const spyTaskExecutorRun = sandbox.stub(task, 'run');
            await task.execute(null as never);
            assert.equal(spyTaskExecutorRun.callCount, 1);
            assert.equal(task.active, true);
            assert.equal(task.halted, false);
            assert.equal(task.completed, false);
        });

        it('should complete task', async () => {
            const task = new DummyTaskExecutor(token, firstExecutionTaskData);
            sandbox.stub(task, 'shouldExecute').value(true);
            const spyTaskExecutorRun = sandbox.stub(task, 'run').callsFake(async () => {
                task.completeTask();
            });
            await task.execute(null as never);
            assert.equal(spyTaskExecutorRun.callCount, 1);
            assert.equal(task.active, false);
            assert.equal(task.halted, false);
            assert.equal(task.completed, true);
        });

        it('should halt task', async () => {
            const task = new DummyTaskExecutor(token, scheduledTaskData);
            sandbox.stub(task, 'shouldExecute').value(true);
            const spyTaskExecutorRun = sandbox.stub(task, 'run');
            await task.execute(null as never);
            assert.equal(spyTaskExecutorRun.callCount, 1);
            assert.equal(task.active, false);
            assert.equal(task.halted, true);
            assert.equal(task.completed, false);
        });

        it('should not run task', async () => {
            const task = new DummyTaskExecutor(token, firstExecutionTaskData);
            sandbox.stub(task, 'shouldExecute').value(false);
            const spyTaskExecutorRun = sandbox.stub(task, 'run');
            await task.execute(null as never);
            assert.equal(spyTaskExecutorRun.callCount, 0);
            assert.equal(task.active, true);
            assert.equal(task.halted, false);
            assert.equal(task.completed, false);
        });

        it('should stop executing completed daemon', async () => {
            const task = new DummyTaskExecutor(token, lastRunCompletedDaemonTaskData);
            sandbox.stub(task, 'shouldExecute').value(true);
            const spyTaskExecutorRun = sandbox.stub(task, 'run');
            await task.execute(null as never);
            assert.equal(spyTaskExecutorRun.callCount, 1);
            assert.equal(task.active, false);
            assert.equal(task.halted, false);
            assert.equal(task.completed, true);
        });
    });

    describe('toJSON', () => {
        it('should format correctly for a task executed for the first time', async () => {
            const {
                taskId, repetitions, delay, daemon,
            } = firstExecutionTaskData;
            const task = new DummyTaskExecutor(token, firstExecutionTaskData);
            await task.execute(null as never);
            const updated = task.toJSON();
            assert.equal(updated.taskId, taskId);
            assert.equal(updated.state, TaskState.IN_PROGRESS);
            assert.equal(updated.active, true);
            assert.equal(updated.repetitions.count, repetitions.count + 1);
            assert.equal(updated.repetitions.repeat, repetitions.repeat);
            assert.equal(updated.repetitions.interval, repetitions.interval);
            assert.equal(updated.repetitions.deadline, repetitions.deadline);
            assert.equal(updated.delay, delay);
            assert.equal(updated.daemon, daemon);
            const estimatedScheduledTime = Date.now() + repetitions.interval! * MS_IN_SECOND;
            const deltaMs = 100;
            assert(estimatedScheduledTime <= updated.scheduledExecutionTime!.getTime());
            assert(updated.scheduledExecutionTime!.getTime() <= estimatedScheduledTime + deltaMs);
        });

        it('should format correctly for a lazy task', async () => {
            const {
                taskId, repetitions, delay, daemon,
            } = lazyTaskData;
            const task = new DummyTaskExecutor(token, lazyTaskData);
            await task.execute(null as never);
            const updated = task.toJSON();
            assert.equal(updated.taskId, taskId);
            assert.equal(updated.state, TaskState.IN_PROGRESS);
            assert.equal(updated.active, true);
            assert.equal(updated.repetitions.count, repetitions.count + 1);
            assert.equal(updated.repetitions.repeat, repetitions.repeat);
            assert.equal(updated.repetitions.interval, repetitions.interval);
            assert.equal(updated.repetitions.deadline, repetitions.deadline);
            assert.equal(updated.delay, delay);
            assert.equal(updated.daemon, daemon);
            assert.equal(updated.scheduledExecutionTime, undefined);
        });

        it('should format correctly for a completed scheduled task', async () => {
            const {
                taskId, repetitions, delay, daemon,
            } = scheduledTaskData;
            const task = new DummyTaskExecutor(token, scheduledTaskData);
            await task.execute(null as never);
            const updated = task.toJSON();
            assert.equal(updated.taskId, taskId);
            assert.equal(updated.state, TaskState.HALTED);
            assert.equal(updated.active, false);
            assert.equal(updated.repetitions.count, repetitions.count + 1);
            assert.equal(updated.repetitions.repeat, repetitions.repeat);
            assert.equal(updated.repetitions.interval, repetitions.interval);
            assert.equal(updated.repetitions.deadline, repetitions.deadline);
            assert.equal(updated.delay, delay);
            assert.equal(updated.daemon, daemon);
            assert.equal(updated.scheduledExecutionTime!, undefined);
        });

        it('should format correctly for an expired task', async () => {
            const {
                taskId, repetitions, delay, daemon,
            } = expiredTaskData;
            const task = new DummyTaskExecutor(token, expiredTaskData);
            await task.execute(null as never);
            const updated = task.toJSON();
            assert.equal(updated.taskId, taskId);
            assert.equal(updated.state, TaskState.HALTED);
            assert.equal(updated.active, false);
            assert.equal(updated.repetitions.count, repetitions.count);
            assert.equal(updated.repetitions.repeat, repetitions.repeat);
            assert.equal(updated.repetitions.interval, repetitions.interval);
            assert.equal(updated.repetitions.deadline, repetitions.deadline);
            assert.equal(updated.delay, delay);
            assert.equal(updated.daemon, daemon);
            assert.equal(updated.scheduledExecutionTime!, undefined);
        });

        it('should format correctly for a completed daemon task that is still active', async () => {
            const {
                taskId, repetitions, delay, daemon,
            } = completedDaemonTaskData;
            const task = new DummyTaskExecutor(token, completedDaemonTaskData);
            await task.execute(null as never);
            const updated = task.toJSON();
            assert.equal(updated.taskId, taskId);
            assert.equal(updated.state, TaskState.DONE);
            assert.equal(updated.active, true);
            assert.equal(updated.repetitions.count, repetitions.count + 1);
            assert.equal(updated.repetitions.repeat, repetitions.repeat);
            assert.equal(updated.repetitions.interval, repetitions.interval);
            assert.equal(updated.repetitions.deadline, repetitions.deadline);
            assert.equal(updated.delay, delay);
            assert.equal(updated.daemon, daemon);
            const estimatedScheduledTime = Date.now() + repetitions.interval! * MS_IN_SECOND;
            const deltaMs = 100;
            assert(estimatedScheduledTime <= updated.scheduledExecutionTime!.getTime());
            assert(updated.scheduledExecutionTime!.getTime() <= estimatedScheduledTime + deltaMs);
        });

        it('should format correctly for a completed daemon ran for the last time', async () => {
            const {
                taskId, repetitions, delay, daemon,
            } = lastRunCompletedDaemonTaskData;
            const task = new DummyTaskExecutor(token, lastRunCompletedDaemonTaskData);
            await task.execute(null as never);
            const updated = task.toJSON();
            assert.equal(updated.taskId, taskId);
            assert.equal(updated.state, TaskState.DONE);
            assert.equal(updated.active, false);
            assert.equal(updated.repetitions.count, repetitions.count + 1);
            assert.equal(updated.repetitions.repeat, repetitions.repeat);
            assert.equal(updated.repetitions.interval, repetitions.interval);
            assert.equal(updated.repetitions.deadline, repetitions.deadline);
            assert.equal(updated.delay, delay);
            assert.equal(updated.daemon, daemon);
            assert.equal(updated.scheduledExecutionTime!, undefined);
        });
    });
}
