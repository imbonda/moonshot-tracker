// 3rd party.
import { trace, type Tracer } from '@opentelemetry/api';

export type { Tracer } from '@opentelemetry/api';

export const tracer: Tracer = trace.getTracer('Scraping');
