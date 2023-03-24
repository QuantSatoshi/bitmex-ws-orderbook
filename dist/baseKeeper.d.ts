/// <reference types="node" />
import EventEmitter from 'events';
import { Logger, RateLimit } from 'el-logger';
import { OrderBookSchema } from 'qs-typings';
export declare namespace BaseKeeper {
    interface Options {
        enableEvent?: boolean;
        silentMode?: boolean;
        maxLevels?: number;
    }
}
export declare class BaseKeeper extends EventEmitter {
    protected logger: Logger;
    lastObWsTime?: Date;
    name: string;
    cachedPollOrderBook: Record<string, OrderBookSchema>;
    protected enableEvent: boolean;
    protected silentMode: boolean;
    protected maxLevels?: number;
    constructor(options: BaseKeeper.Options);
    initLogger(): void;
    onOrderBookUpdated(callback: (ob: OrderBookSchema) => any): void;
    pollingRateLimiter: RateLimit;
    pollOrderBook(pairEx: string): Promise<OrderBookSchema>;
    pollOrderBookWithRateLimit(pairEx: string): Promise<OrderBookSchema>;
}
