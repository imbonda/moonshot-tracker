// Internal.
import type { Audit, AuditProvider, TokenInsights } from '../../../@types/dex-tools';
import { scraper, AudicCheck, AUDIT_CHECKS } from '../../../lib/scraping/dex-tools/scraper';
import { TaskExecutor } from '../executors/task';

type AuditMatrix = {
    [check in keyof Audit]: {
        [provider in AuditProvider]: Audit[check]
    }
};

type AuditBooleanPredicate = (value: boolean) => boolean;
type AuditNumricPredicate = (value: number) => boolean;
type AuditPredicate = AuditBooleanPredicate | AuditNumricPredicate;

const RED_FLAG_PREDICATES: Record<AudicCheck, AuditPredicate> = {
    [AudicCheck.CONTRACT_VERIFIED]: (isVerified: boolean) => !isVerified,
    [AudicCheck.HONEYPOT]: (isHoneypot: boolean) => isHoneypot,
    [AudicCheck.BUY_TAX]: (tax: number) => tax >= 0.2,
    [AudicCheck.SELL_TAX]: (tax: number) => tax >= 0.2,
    [AudicCheck.PROXY]: (isProxy: boolean) => isProxy,
    [AudicCheck.OWNER_PERCENT]: (ownerShare: number) => ownerShare >= 0.05,
    [AudicCheck.CREATOR_PERCENT]: (creatorShare: number) => creatorShare >= 0.05,
};

export class DEXToolsAuditCheck extends TaskExecutor {
    private dexToolsInsight?: { dextools: TokenInsights};

    private auditMatrix?: AuditMatrix;

    private redFlags?: Record<string, true>;

    protected async run(): Promise<void> {
        const { chainId } = this.token;
        const tokenAddress = this.token.address;

        const result = await scraper.fetchTokenInsights(chainId, tokenAddress);

        if (!result) {
            return;
        }

        this.dexToolsInsight = { dextools: result };
        this.auditMatrix = this.buildAuditMatrix();
        this.setRedFlags();

        // TODO: consider checking audit alerts even before obtaining all the intel.
        if (!this.sufficientIntel) {
            return;
        }

        if (this.isFraud) {
            this.stopTracking();
            return;
        }

        if (this.completedAudit) {
            this.setCompleted();
        }
    }

    private buildAuditMatrix(): AuditMatrix {
        const { createdAt: _, ...auditors } = this.externalAudit;
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
                const auditResults = Object.values(audits ?? {});
                const predicateResults = auditResults.map(predicate);
                const alertingResults = predicateResults.filter((isRedFlag) => !!isRedFlag);
                const isRedFlag = alertingResults.length > 0;
                if (isRedFlag) {
                    accum[check as AudicCheck] = true;
                }
                return accum;
            }, {} as Record<AudicCheck, true>);
    }

    public get insight(): Record<string, unknown> {
        if (!this.dexToolsInsight) {
            return super.insight;
        }
        return this.dexToolsInsight;
    }

    private get audit(): TokenInsights['audit'] {
        return this.dexToolsInsight!.dextools.audit;
    }

    private get externalAudit(): TokenInsights['audit']['external'] {
        return this.dexToolsInsight!.dextools.audit.external;
    }

    private get links(): TokenInsights['links'] {
        return this.dexToolsInsight!.dextools.links;
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
