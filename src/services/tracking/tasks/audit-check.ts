// Internal.
import type {
    DexToolsTokenInsights,
    Audit, AuditProvider,
    TokenAudit, ExternalTokenAudits,
    AuditMatrix, RedFlags,
    TaxValueRange,
} from '../../../@types/dex-tools';
import type { valueof } from '../../../@types/generics';
import { AudicCheck, AUDIT_CHECKS } from '../../../lib/scraping/dex-tools/scraper';
import { ContextExecutor } from '../executors/context';
import { type InsightsKey, type TaskInsights, TaskExecutor } from '../executors/task';
import { TaskId } from '../static';

type AuditPredicate = (value: boolean | number) => boolean

const RED_FLAG_PREDICATES = {
    [AudicCheck.CONTRACT_VERIFIED]: (isVerified: boolean) => !isVerified,
    [AudicCheck.HONEYPOT]: (isHoneypot: boolean) => isHoneypot,
    [AudicCheck.BUY_TAX]: (tax: number | TaxValueRange) => {
        const threshold = 0.2;
        return ((tax as TaxValueRange)?.max || (tax as number)) >= threshold;
    },
    [AudicCheck.SELL_TAX]: (tax: number | TaxValueRange) => {
        const threshold = 0.2;
        return ((tax as TaxValueRange)?.max || (tax as number)) >= threshold;
    },
    [AudicCheck.PROXY]: (isProxy: boolean) => isProxy,
} as Record<AudicCheck, AuditPredicate>;

export class AuditCheck extends TaskExecutor {
    private tokenInsights?: DexToolsTokenInsights;

    private auditMatrix?: AuditMatrix;

    private redFlags?: RedFlags;

    protected async run(context: ContextExecutor): Promise<void> {
        const dexToolsScraperTaskId = TaskId.DEX_TOOLS_SCRAPER;
        const dexToolsInsights = await context.getLatestTaskInsightsUnwrapped(
            dexToolsScraperTaskId,
        ) as DexToolsTokenInsights;
        const isDexToolsScraperActive = context.isTaskActive(dexToolsScraperTaskId);
        if (!isDexToolsScraperActive) {
            this.halt();
            return;
        }

        this.tokenInsights = dexToolsInsights as DexToolsTokenInsights;
        if (!this.audit) {
            return;
        }

        this.auditMatrix = this.buildAuditMatrix();
        this.setRedFlags();

        // TODO: consider checking audit alerts even before obtaining all the intel.
        if (!this.sufficientIntel) {
            return;
        }

        if (this.isFraud) {
            this.setProbation();
            return;
        }
        this.clearProbation();

        // Setting task state to be completed so that the pipeline can continue.
        // This task should be a daemon so it can continue checking audit until halting/aborting.
        this.setCompleted();
    }

    private buildAuditMatrix(): AuditMatrix {
        const { createdAt: _, ...auditors } = this.externalAudits || {};
        const matrix = Object.entries(auditors).reduce((mat, [provider, audit]) => {
            Object.entries(audit).forEach(([check, value]) => {
                mat[check as keyof Audit] ||= {} as never;
                mat[check as keyof Audit]![provider as AuditProvider] = value;
            });
            return mat;
        }, {} as AuditMatrix);
        return matrix;
    }

    private setRedFlags(): void {
        this.redFlags = Object
            .entries(RED_FLAG_PREDICATES)
            .reduce((accum, [check, predicate]) => {
                const audits = this.auditMatrix![check as AudicCheck];
                const alertingAuditEntries = Object.entries(audits || {})
                    .filter(([_, audit]) => !!predicate(audit));
                const alertingAudits = Object.fromEntries(alertingAuditEntries);
                const hasAlertingAudits = alertingAuditEntries.length > 0;
                if (hasAlertingAudits) {
                    accum[check as keyof RedFlags] = alertingAudits as valueof<RedFlags>;
                }
                return accum;
            }, {} as RedFlags);
    }

    // eslint-disable-next-line class-methods-use-this
    public get insightsKey(): InsightsKey {
        return 'audit';
    }

    public get insights(): TaskInsights {
        if (!this.tokenInsights) {
            return super.insights;
        }

        const { auditMatrix, redFlags } = this;
        return {
            [this.insightsKey]: { auditMatrix, redFlags },
        };
    }

    private get audit(): TokenAudit | undefined {
        return this.tokenInsights?.audit;
    }

    private get externalAudits(): ExternalTokenAudits | undefined {
        return this.audit?.external;
    }

    private get sufficientIntel(): boolean {
        AUDIT_CHECKS.every((check) => {
            const externalAudits = this.auditMatrix![check] || {};
            const auditsCount = Object.keys(externalAudits).length;
            return auditsCount >= 1;
        });
        return true;
    }

    private get hasRedFlags(): boolean {
        return Object.keys(this.redFlags!).length > 0;
    }

    private get isFraud(): boolean {
        const unverified = this.audit?.codeVerified === false;
        return unverified || this.hasRedFlags;
    }
}
