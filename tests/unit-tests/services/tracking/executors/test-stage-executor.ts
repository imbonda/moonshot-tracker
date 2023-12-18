// Builtin.
import assert from 'assert';
// 3rd party.
import { createSandbox, SinonSpy, type SinonSandbox } from 'sinon';
// Internal.
import type { PipelineStage, TaskData, TrackedToken } from '../../../../../src/@types/tracking';
import { ContextExecutor } from '../../../../../src/services/tracking/executors/context';
import { StageExecutor } from '../../../../../src/services/tracking/executors/stage';
import { TaskExecutor } from '../../../../../src/services/tracking/executors/task';
import { TaskFactory } from '../../../../../src/services/tracking/tasks/task-factory';
import { StageState } from '../../../../../src/services/tracking/static';
import { DummyTaskExecutor } from './utils';

const token = { address: '0x12345', tasks: {} } as TrackedToken;

const taskData = { state: null, repetitions: {} } as never as TaskData;

const task1: TaskExecutor = new DummyTaskExecutor(token, { ...taskData, taskId: 'task1' });

const task2: TaskExecutor = new DummyTaskExecutor(token, { ...taskData, taskId: 'task2' });

const task3: TaskExecutor = new DummyTaskExecutor(token, { ...taskData, taskId: 'task3' });

const task4: TaskExecutor = new DummyTaskExecutor(token, { ...taskData, taskId: 'task4' });

const taskById: Record<string, TaskExecutor> = {
    [task1.id]: task1,
    [task2.id]: task2,
    [task3.id]: task3,
    [task4.id]: task4,
};

const context = {
    execute: (taskId: string) => taskById[taskId].execute(null as never),
    isTaskCompleted: (taskId: string) => taskById[taskId].completed,
} as ContextExecutor;

/**
 * Stages.
 */

const firstStage: PipelineStage = {
    stageId: 'first',
    state: StageState.UNLOCKED,
    taskIds: [task1.id, task2.id],
    prerequisiteTasks: [],
};

const finishedStage: PipelineStage = {
    stageId: 'finished',
    state: StageState.DONE,
    taskIds: [task1.id, task2.id],
    prerequisiteTasks: [],
};

const postrequisiteStage: PipelineStage = {
    stageId: 'first',
    state: StageState.LOCKED,
    taskIds: [task3.id, task4.id],
    prerequisiteTasks: [task2.id],
};

export function testStageExecutor() {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = createSandbox();
        sandbox.stub(TaskFactory, 'createTask');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('execute', () => {
        let spyTask1Execute: SinonSpy;
        let spyTask2Execute: SinonSpy;
        let spyTask3Execute: SinonSpy;
        let spyTask4Execute: SinonSpy;

        beforeEach(() => {
            spyTask1Execute = sandbox.stub(task1, 'execute');
            spyTask2Execute = sandbox.stub(task2, 'execute');
            spyTask3Execute = sandbox.stub(task3, 'execute');
            spyTask4Execute = sandbox.stub(task4, 'execute');
        });

        it('should execute tasks at an unlocked stage', async () => {
            const stage = new StageExecutor(token, firstStage);
            sandbox.stub(stage, 'tasks').value([task1, task2]);
            sandbox.stub(task2, 'shouldExecute').value(true);
            await stage.execute(context);
            assert.equal(spyTask1Execute.callCount, 0);
            assert.equal(spyTask2Execute.callCount, 1);
            assert.equal(spyTask3Execute.callCount, 0);
            assert.equal(spyTask4Execute.callCount, 0);
        });

        it('should not execute tasks at a finished stage', async () => {
            const stage = new StageExecutor(token, finishedStage);
            sandbox.stub(stage, 'tasks').value([task1, task2]);
            sandbox.stub(task1, 'shouldExecute').value(false);
            sandbox.stub(task2, 'shouldExecute').value(false);
            await stage.execute(context);
            assert.equal(spyTask1Execute.callCount, 0);
            assert.equal(spyTask2Execute.callCount, 0);
            assert.equal(spyTask3Execute.callCount, 0);
            assert.equal(spyTask4Execute.callCount, 0);
        });
    });

    describe('attemptUnlock', () => {
        let spyTask1SetActivated: SinonSpy;
        let spyTask2SetActivated: SinonSpy;
        let spyTask3SetActivated: SinonSpy;
        let spyTask4SetActivated: SinonSpy;

        beforeEach(() => {
            spyTask1SetActivated = sandbox.stub(task1, 'setActivated');
            spyTask2SetActivated = sandbox.stub(task2, 'setActivated');
            spyTask3SetActivated = sandbox.stub(task3, 'setActivated');
            spyTask4SetActivated = sandbox.stub(task4, 'setActivated');
        });

        it('should unlock stage with unsatisfied pre-requisite tasks', async () => {
            const stage = new StageExecutor(token, postrequisiteStage);
            sandbox.stub(stage, 'tasks').value([task3, task4]);
            sandbox.stub(task2, 'completed').value(true);
            stage.attemptUnlock(context);
            assert.equal(stage.unlocked, true);
            assert.equal(spyTask1SetActivated.callCount, 0);
            assert.equal(spyTask2SetActivated.callCount, 0);
            assert.equal(spyTask3SetActivated.callCount, 1);
            assert.equal(spyTask4SetActivated.callCount, 1);
        });

        it('should not unlock stage with unsatisfied pre-requisite tasks', async () => {
            const stage = new StageExecutor(token, postrequisiteStage);
            sandbox.stub(stage, 'tasks').value([task3, task4]);
            sandbox.stub(task2, 'completed').value(false);
            stage.attemptUnlock(context);
            assert.equal(stage.unlocked, false);
            assert.equal(spyTask1SetActivated.callCount, 0);
            assert.equal(spyTask2SetActivated.callCount, 0);
            assert.equal(spyTask3SetActivated.callCount, 0);
            assert.equal(spyTask4SetActivated.callCount, 0);
        });

        it('should skip for a stage that was already unlocked', async () => {
            const stage = new StageExecutor(token, firstStage);
            stage.attemptUnlock(context);
            assert.equal(stage.unlocked, true);
            assert.equal(spyTask1SetActivated.callCount, 0);
            assert.equal(spyTask2SetActivated.callCount, 0);
            assert.equal(spyTask3SetActivated.callCount, 0);
            assert.equal(spyTask4SetActivated.callCount, 0);
        });
    });

    describe('toJSON', () => {
        it('should format correctly for a stage executed for the first time', async () => {
            const {
                stageId,
                taskIds,
                prerequisiteTasks,
            } = firstStage;
            const stage = new StageExecutor(token, firstStage);
            sandbox.stub(stage, 'tasks').value([task1, task2]);
            sandbox.stub(task1, 'shouldExecute').value(true);
            await stage.execute(context);
            const updated = stage.toJSON();
            assert.equal(updated.stageId, stageId);
            assert.equal(updated.state, StageState.IN_PROGRESS);
            assert.equal(updated.taskIds, taskIds);
            assert.equal(updated.prerequisiteTasks, prerequisiteTasks);
        });

        it('should format correctly for a halted stage', async () => {
            const {
                stageId,
                taskIds,
                prerequisiteTasks,
            } = firstStage;
            const stage = new StageExecutor(token, firstStage);
            sandbox.stub(stage, 'tasks').value([task1, task2]);
            sandbox.stub(task1, 'shouldExecute').value(true);
            sandbox.stub(task2, 'shouldExecute').value(true);
            sandbox.stub(task1, 'halted').value(true);
            sandbox.stub(task2, 'halted').value(true);
            await stage.execute(context);
            const updated = stage.toJSON();
            assert.equal(updated.stageId, stageId);
            assert.equal(updated.state, StageState.HALTED);
            assert.equal(updated.taskIds, taskIds);
            assert.equal(updated.prerequisiteTasks, prerequisiteTasks);
        });

        it('should format correctly for a completed stage', async () => {
            const {
                stageId,
                taskIds,
                prerequisiteTasks,
            } = firstStage;
            const stage = new StageExecutor(token, firstStage);
            sandbox.stub(stage, 'tasks').value([task1, task2]);
            sandbox.stub(task1, 'shouldExecute').value(true);
            sandbox.stub(task2, 'shouldExecute').value(true);
            sandbox.stub(task1, 'completed').value(true);
            sandbox.stub(task2, 'completed').value(true);
            await stage.execute(context);
            const updated = stage.toJSON();
            assert.equal(updated.stageId, stageId);
            assert.equal(updated.state, StageState.DONE);
            assert.equal(updated.taskIds, taskIds);
            assert.equal(updated.prerequisiteTasks, prerequisiteTasks);
        });

        it('should format correctly for a locked stage', async () => {
            const {
                stageId,
                state,
                taskIds,
                prerequisiteTasks,
            } = postrequisiteStage;
            const stage = new StageExecutor(token, postrequisiteStage);
            sandbox.stub(stage, 'tasks').value([task3, task4]);
            await stage.execute(context);
            const updated = stage.toJSON();
            assert.equal(updated.stageId, stageId);
            assert.equal(updated.state, state);
            assert.equal(updated.taskIds, taskIds);
            assert.equal(updated.prerequisiteTasks, prerequisiteTasks);
        });
    });
}
