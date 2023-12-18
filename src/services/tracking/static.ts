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
    FAILED = 'failed',
}

export const enum TaskState {
    PENDING = 'pending',
    ACTIVATED = 'activated',
    IN_PROGRESS = 'inProgress',
    DISACTIVATED = 'disactivated',
    DONE = 'done',
    FAILED = 'failed',
}

export const enum TaskId {
    DEX_TOOLS_AUDIT_CHECK = 'dexToolsAuditCheck',
}
