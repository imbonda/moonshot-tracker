// 3rd party.
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
// Internal.
import { nodeEnv, opentelemetryConfig, web3Config } from '../config';
import { Logger } from './logger';

class OTELTracer {
    static logger: Logger;

    static sdk: NodeSDK;

    static get serviceName() {
        const args = process.argv;
        const service = args[args.indexOf('--service') + 1];
        const chain = web3Config.CHAIN_NAME;
        return `[${nodeEnv}] ${service}${chain ? ` ${chain}` : ''}`;
    }

    static {
        this.logger = new Logger(OTELTracer.name);

        const traceExporter = new OTLPTraceExporter({
            url: opentelemetryConfig.EXPORTER_TRACES_ENDPOINT,
            headers: {
                [opentelemetryConfig.EXPORTER_API_KEY_NAME]: opentelemetryConfig.EXPORTER_API_KEY,
            },
        });

        const resource = new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
            SampleRate: opentelemetryConfig.SAMPLE_RATE,
        });
        const provider = new NodeTracerProvider({ resource });
        provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
        provider.register();

        this.sdk = new NodeSDK({
            traceExporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': {
                        enabled: false,
                    },
                }),
            ],
            sampler: new TraceIdRatioBasedSampler(1 / opentelemetryConfig.SAMPLE_RATE),
        });
    }

    static run(): void {
        try {
            this.sdk.start();
        } catch (err) {
            this.logger.error('Initialization failed', err);
        }
        this.logger.info('Initialized successfully');

        process.on('SIGTERM', async () => {
            try {
                await this.sdk.shutdown();
                this.logger.info('Shutdown successfully');
            } catch (err) {
                this.logger.error('Shutdown failed', err);
            } finally {
                process.exit(0);
            }
        });
    }
}

function main() {
    OTELTracer.run();
}

main();
