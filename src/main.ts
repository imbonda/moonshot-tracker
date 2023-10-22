// 3rd party.
import { program, Option, OptionValues } from 'commander';
// Internal.
import { Service, ServiceClass } from './services/service';
import { TrackingAgent } from './services/tracking/agent';
import { TrackingScheduler } from './services/scheduling/scheduler';
import { BlockchainMonitor } from './services/monitoring/monitor';

class Launcher {
    private servicesByName: Record<string, ServiceClass>;

    private inputOptions: Option[];

    constructor() {
        this.servicesByName = {
            monitor: BlockchainMonitor,
            trackingAgent: TrackingAgent,
            trackingScheduler: TrackingScheduler,
        };
        this.inputOptions = [
            new Option('-s, --service <name>', 'name of the service to start')
                .choices(Object.keys(this.servicesByName))
                .makeOptionMandatory(),
        ];
    }

    get service(): Service {
        const { service: name } = this.parseArgs();
        return new this.servicesByName[name]();
    }

    parseArgs(): OptionValues {
        this.inputOptions.forEach((option) => program.addOption(option));
        return program.parse().opts();
    }

    async launch(): Promise<void> {
        const { service } = this;
        await service.setup();
        await service.start().catch((err) => service.teardown());
    }
}

async function main() {
    new Launcher().launch();
}

main();
