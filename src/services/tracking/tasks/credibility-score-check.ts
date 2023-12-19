// Internal.
import { ContextExecutor } from '../executors/context';
import { TaskExecutor } from '../executors/task';
import { TaskId } from '../static';

type CredibilityScoreConfig = { threshold: number };

export class CredibilityScoreCheck extends TaskExecutor {
    protected async run(context: ContextExecutor): Promise<void> {
        const dependentTaskId = TaskId.DEX_TOOLS_AUDIT_CHECK;
        const dextoolsInsights = await context.getLatestResolvedTaskInsights(dependentTaskId);
        if (!context.isTaskAlive(dependentTaskId)) {
            this.halt();
            return;
        }

        const { total: dextScore } = dextoolsInsights?.topPair.dextScore ?? {};
        if (dextScore && dextScore >= this.threshold) {
            this.setCompleted();
        }
    }

    private get threshold(): number {
        const threshold = (this.config as CredibilityScoreConfig)?.threshold;
        return threshold ?? 0;
    }
}
