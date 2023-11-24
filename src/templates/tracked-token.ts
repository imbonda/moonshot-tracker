// Internal.
import type { TrackedToken } from '../@types/tracking';
import { MS_IN_SECOND } from '../lib/constants';
import { PIPELINE_TEMPLATE, TASKS_TEMPLATE } from './tracking-pipeline';

const DEFAULT_DELAY_MS = 60 * 60 * MS_IN_SECOND; // 1 hour.

export function createTrackedToken(
    chainId: number,
    address: string,
): TrackedToken {
    const uuid = `${chainId}.${address}`;
    const executionDelayMs = DEFAULT_DELAY_MS;
    return {
        uuid,
        chainId,
        address,
        tracking: true,
        pipeline: PIPELINE_TEMPLATE,
        tasks: TASKS_TEMPLATE,
        insights: null,
        aborted: false,
        completed: false,
        currentStageIndex: 0,
        scheduledExecutionTime: new Date(Date.now() + executionDelayMs),
    };
}
