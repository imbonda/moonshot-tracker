// 3rd party.
import { trace, type Tracer } from '@opentelemetry/api';

export type { Tracer } from '@opentelemetry/api';

export const tracer: Tracer = trace.getTracer('Tracking');

export const enum StageState {
    LOCKED = 'locked',
    UNLOCKED = 'unlocked',
    IN_PROGRESS = 'inProgress',
    HALTED = 'halted',
    DONE = 'done',
    // @not-supported
    FAILED = 'failed',
}

export const enum TaskState {
    PENDING = 'pending',
    ACTIVATED = 'activated',
    IN_PROGRESS = 'inProgress',
    HALTED = 'halted',
    DONE = 'done',
    // @not-supported
    FAILED = 'failed',
}

export const enum TaskId {
    DEX_TOOLS_SCRAPER = 'dexToolsAuditScraper',
    AUDIT_CHECK = 'auditCheck',
    CREDIBILITY_CHECK = 'credibilityCheck',
}
