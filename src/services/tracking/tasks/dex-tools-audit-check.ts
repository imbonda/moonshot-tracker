// Internal.
import type {
    Audit, AuditMatrix, AuditProvider, RedFlags, DexToolsTokenInsights,
} from '../../../@types/dex-tools';
import type { valueof } from '../../../@types/generics';
import { scraper, AudicCheck, AUDIT_CHECKS } from '../../../lib/scraping/dex-tools/scraper';
import { type InsightsKey, type TaskInsights, TaskExecutor } from '../executors/task';

type AuditPredicate = (value: boolean | number) => boolean

const RED_FLAG_PREDICATES = {
    [AudicCheck.CONTRACT_VERIFIED]: (isVerified: boolean) => !isVerified,
    [AudicCheck.HONEYPOT]: (isHoneypot: boolean) => isHoneypot,
    [AudicCheck.BUY_TAX]: (tax: number) => tax >= 0.2,
    [AudicCheck.SELL_TAX]: (tax: number) => tax >= 0.2,
    [AudicCheck.PROXY]: (isProxy: boolean) => isProxy,
    [AudicCheck.OWNER_PERCENT]: (ownerShare: number) => ownerShare >= 0.05,
    [AudicCheck.CREATOR_PERCENT]: (creatorShare: number) => creatorShare >= 0.05,
} as Record<AudicCheck, AuditPredicate>;

export class DEXToolsAuditCheck extends TaskExecutor {
    private tokenInsights?: DexToolsTokenInsights;

    private auditMatrix?: AuditMatrix;

    private redFlags?: RedFlags;

    protected async run(): Promise<void> {
        const { chainId } = this.token;
        const tokenAddress = this.token.address;

        const result = await scraper.fetchTokenInsights(chainId, tokenAddress);

        if (!result) {
            return;
        }

        this.tokenInsights = result;
        this.auditMatrix = this.buildAuditMatrix();
        this.setRedFlags();

        // TODO: consider checking audit alerts even before obtaining all the intel.
        if (!this.sufficientIntel) {
            return;
        }

        if (this.isFraud) {
            this.abort();
            return;
        }

        if (this.completedAudit) {
            this.setCompleted();
        }
    }

    private buildAuditMatrix(): AuditMatrix {
        const { createdAt: _, ...auditors } = this.externalAudit ?? {};
        const matrix = Object.entries(auditors).reduce((mat, [provider, audit]) => {
            Object.entries(audit).forEach(([check, value]) => {
                mat[check as keyof Audit] ??= {} as never;
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
                const alertingAuditEntries = Object.entries(audits ?? {})
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
        return 'dextools';
    }

    public get insights(): TaskInsights {
        if (!this.tokenInsights) {
            return super.insights;
        }
        return {
            [this.insightsKey]: {
                ...this.tokenInsights,
                auditMatrix: this.auditMatrix!,
                redFlags: this.redFlags!,
            },
        };
    }

    private get audit(): DexToolsTokenInsights['audit'] {
        return this.tokenInsights!.audit;
    }

    private get externalAudit(): DexToolsTokenInsights['audit']['external'] {
        return this.audit.external;
    }

    private get links(): DexToolsTokenInsights['links'] {
        return this.tokenInsights!.links;
    }

    private get sufficientIntel(): boolean {
        AUDIT_CHECKS.every((check) => {
            const externalAudits = this.auditMatrix![check] ?? {};
            const auditsCount = Object.keys(externalAudits).length;
            return auditsCount >= 1;
        });
        return true;
    }

    private get hasRedFlags(): boolean {
        return Object.keys(this.redFlags!).length > 0;
    }

    private get isFraud(): boolean {
        return !this.audit.codeVerified || this.hasRedFlags;
    }

    private get completedAudit(): boolean {
        // TODO: make sure has all relevant data for next stage.
        return !!this.links.telegram;
    }
}
