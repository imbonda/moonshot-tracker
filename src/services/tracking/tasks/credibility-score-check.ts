// Internal.
import { ContextExecutor } from '../executors/context';
import { TaskExecutor } from '../executors/task';
import { TaskId } from '../static';

type CredibilityScoreConfig = { threshold: number };

export class CredibilityScoreCheck extends TaskExecutor {
    protected async run(context: ContextExecutor): Promise<void> {
        const dexToolsAuditTaskId = TaskId.DEX_TOOLS_AUDIT_CHECK;
        const dexToolsInsights = await context.getLatestResolvedTaskInsights(dexToolsAuditTaskId);
        const isDexToolsAuditAlive = context.isTaskAlive(dexToolsAuditTaskId);
        const isDexToolsAuditCompleted = context.isTaskCompleted(dexToolsAuditTaskId);
        if (!isDexToolsAuditAlive) {
            this.halt();
            return;
        }

        const { total: dextScore } = dexToolsInsights?.topPair.dextScore ?? {};
        const isCredibleScore = dextScore! >= this.threshold;
        if (isDexToolsAuditCompleted && isCredibleScore) {
            this.setCompleted();
        }
    }

    private get threshold(): number {
        const threshold = (this.config as CredibilityScoreConfig)?.threshold;
        return threshold ?? 0;
    }
}
