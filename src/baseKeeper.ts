import EventEmitter from 'events';
import { Logger, RateLimit } from 'el-logger';
import { OrderBookSchema } from 'qs-typings';

export namespace BaseKeeper {
  export interface Options {
    enableEvent?: boolean;
    silentMode?: boolean;
    maxLevels?: number;
    minObEventGapMs?: number;
  }
}
export class BaseKeeper extends EventEmitter {
  protected logger: Logger;
  lastObWsTime?: Date;
  name = 'default'; // override this
  cachedPollOrderBook: Record<string, OrderBookSchema> = {};
  protected enableEvent: boolean;
  protected silentMode: boolean;
  protected maxLevels?: number;
  protected lastEventTsMap: Record<string, number> = {};
  protected minObEventGapMs: number;

  constructor(options: BaseKeeper.Options) {
    super();
    this.enableEvent = options.enableEvent || false;
    this.silentMode = options.silentMode || false;
    this.logger = new Logger({ name: this.name });
    this.maxLevels = options.maxLevels;
    this.minObEventGapMs = options.minObEventGapMs || 200;
  }

  initLogger() {
    this.logger = new Logger({ name: this.name });
  }

  onOrderBookUpdated(callback: (ob: OrderBookSchema) => any) {
    this.on('orderbook', callback);
  }

  // once per 2 seconds
  pollingRateLimiter = new RateLimit(1, 2);

  async pollOrderBook(pairEx: string): Promise<OrderBookSchema> {
    throw new Error(`must override pollOrderBook`);
  }

  async pollOrderBookWithRateLimit(pairEx: string) {
    // apply some sort of rate limit to this, otherwise it may go crazy.
    return new Promise<OrderBookSchema>(async (resolve, reject) => {
      try {
        const ran = this.pollingRateLimiter.run(async () => {
          this.cachedPollOrderBook[pairEx] = await this.pollOrderBook(pairEx);
          resolve(this.cachedPollOrderBook[pairEx]);
        });
        if (!ran) {
          // it's possible this is first time fetching, just poll orderbook
          if (!this.cachedPollOrderBook[pairEx]) {
            this.cachedPollOrderBook[pairEx] = await this.pollOrderBook(pairEx);
          }
          resolve(this.cachedPollOrderBook[pairEx]);
        }
      } catch (e) {
        reject(null);
      }
    });
  }

  destroy() {
    this.removeAllListeners('orderbook');
  }
}
