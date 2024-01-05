import { BybitRequest } from 'bitmex-request';
import { sortedFindIndex, isTimeWithinRange, last } from 'qs-js-utils';
import { sortOrderBooks, verifyObPollVsObWs } from './utils/parsingUtils';
import { BybitOb } from './types/bybit.type';
import { InternalOb } from './types/shared.type';
import { OrderBookItem, OrderBookSchema } from 'qs-typings';
import { BaseKeeper } from './baseKeeper';
import { buildFromOrderedOb, findBestAsk, findBestBid, reverseBuildIndex } from './utils/orderdOrderbookUtils';
export namespace BybitOrderBookKeeper {
  export interface Options extends BaseKeeper.Options {
    testnet?: boolean;
  }
}

export class BybitOrderBookKeeper extends BaseKeeper {
  protected storedObs: Record<string, Record<string, InternalOb>> = {};
  protected storedObsOrdered: Record<string, InternalOb[]> = {};
  protected currentSplitIndex: Record<string, number> = {};
  protected testnet: boolean;
  protected bybitRequest: BybitRequest;
  name = 'bybitObKeeper';

  VERIFY_OB_PERCENT = 0.1;
  VALID_OB_WS_GAP = 20 * 1000;

  constructor(options: BybitOrderBookKeeper.Options) {
    super(options);
    this.testnet = options.testnet || false;
    this.bybitRequest = new BybitRequest({ testnet: this.testnet });

    this.initLogger();
  }

  // either parsed object or raw text
  onSocketMessage(msg: any) {
    try {
      const res = typeof msg === 'string' ? JSON.parse(msg) : msg;
      const pairMatch = res && res.topic.match(/^orderBookL2_25\.(.*)/);
      const pair = pairMatch && pairMatch[1];
      if (pair) {
        this.storedObs[pair] = this.storedObs[pair] || {};
        this.lastObWsTime = new Date();
        this.onReceiveOb(res);
      }
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }

  toInternalOb(ob: BybitOb.OBRow): InternalOb {
    return {
      s: ob.side === 'Buy' ? 0 : 1,
      r: parseFloat(ob.price),
      a: ob.size,
      id: ob.id,
    };
  }

  private searchAndInsertObRow(newRowRef: InternalOb, pair: string) {
    if (this.storedObsOrdered[pair].length === 0) {
      this.storedObsOrdered[pair].push(newRowRef);
    } else if (newRowRef.r > last(this.storedObsOrdered[pair])!.r) {
      this.storedObsOrdered[pair].push(newRowRef);
    } else if (newRowRef.r < this.storedObsOrdered[pair][0]!.r) {
      this.storedObsOrdered[pair].unshift(newRowRef);
    } else {
      // try to find the price using binary search first. slightly faster.
      const foundIndex = sortedFindIndex(this.storedObsOrdered[pair], newRowRef.r, x => x.r);
      if (foundIndex !== -1) {
        this.storedObsOrdered[pair][foundIndex] = newRowRef;
      } else {
        // if not found, insert with new price.
        for (let i = 0; i < this.storedObsOrdered[pair].length; i++) {
          if (newRowRef.r < this.storedObsOrdered[pair][i].r) {
            this.storedObsOrdered[pair].splice(i, 0, newRowRef);
            break;
          }
        }
      }
    }
  }

  onReceiveOb(obs: BybitOb.OrderBooks, _pair?: string) {
    // for rebuilding orderbook process.
    if (['snapshot'].includes(obs.type)) {
      // first init, refresh ob data.
      const obRows = (obs as BybitOb.OrderBooksNew).data;
      const pair = _pair || obRows[0].symbol;
      // reset data
      if (pair) {
        this.storedObs[pair] = {};
        this.storedObsOrdered[pair] = [];
      }
      obRows.forEach(row => {
        const pair = _pair || row.symbol;
        const newRowRef = this.toInternalOb(row);
        this.storedObs[pair][String(row.id)] = newRowRef;
        this.searchAndInsertObRow(newRowRef, pair);
      });
      // reverse build index
      reverseBuildIndex(this.storedObsOrdered[pair], this.storedObs[pair]);
    } else if (obs.type === 'delta') {
      let pair = _pair;
      if (obs.data.insert.length > 0) {
        pair = _pair || obs.data.insert[0].symbol;
        this.storedObs[pair] = this.storedObs[pair] || {};
        this.storedObsOrdered[pair] = this.storedObsOrdered[pair] || [];
      }

      (obs as BybitOb.OrderBooksDelta).data.insert.forEach(row => {
        pair = _pair || row.symbol;
        const newRowRef = this.toInternalOb(row);
        this.storedObs[pair][String(row.id)] = newRowRef;
        this.searchAndInsertObRow(newRowRef, pair);
      });

      if (pair && !this.storedObs[pair]) {
        // wait for first ob snapshot
        return;
      }

      // if this order exists, we update it, otherwise don't worry
      (obs as BybitOb.OrderBooksDelta).data.update.forEach(row => {
        pair = _pair || row.symbol;
        if (this.storedObs[pair][String(row.id)]) {
          // must update one by one because update doesn't contain price
          const newRowRef = this.toInternalOb(row);
          this.storedObs[pair][String(row.id)].a = newRowRef.a;
          if (this.storedObs[pair][String(row.id)].s !== newRowRef.s) {
            this.storedObs[pair][String(row.id)].s = newRowRef.s;
            this.currentSplitIndex[pair] = this.storedObs[pair][String(row.id)].idx!;
          }
        } else {
          // sometimes we cannot find the id, so we gotta to insert new
          const newRowRef = this.toInternalOb(row);
          this.storedObs[pair][String(row.id)] = newRowRef;
          this.searchAndInsertObRow(newRowRef, pair);
        }
      });

      // reverse build index
      if (pair && (obs as BybitOb.OrderBooksDelta).data.insert.length > 0) {
        reverseBuildIndex(this.storedObsOrdered[pair], this.storedObs[pair]);
      }

      (obs as BybitOb.OrderBooksDelta).data.delete.forEach(row => {
        pair = _pair || row.symbol;
        if (!this.storedObs[pair]) {
          console.error(`invalid ob for pair ${pair}`, this.storedObs[pair]);
        }
        if (this.storedObs[pair][String(row.id)]) {
          const idx = this.storedObs[pair][String(row.id)].idx!;
          this.storedObsOrdered[pair][idx].a = 0;
          delete this.storedObs[pair][String(row.id)];
        }
      });
    }
    if (this.enableEvent) {
      this.emit(`orderbook`, this.getOrderBookWs(obs.topic.match(/orderBookL2_25\.(.*)/)![1]));
    }
  }

  getOrderBookWsOld(pair: string, depth: number = 25): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;
    const bidsUnsortedRaw = Object.values(dataRaw).filter(o => o.s === 0 && o.a > 0);
    const askUnsortedRaw = Object.values(dataRaw).filter(o => o.s === 1 && o.a > 0);
    const bidsUnsorted: OrderBookItem[] = bidsUnsortedRaw.map(d => ({ r: +d.r, a: d.a }));
    const asksUnsorted: OrderBookItem[] = askUnsortedRaw.map(d => ({ r: +d.r, a: d.a }));

    const sortedOb = sortOrderBooks({
      pair,
      ts: this.lastObWsTime!.getTime(),
      bids: bidsUnsorted,
      asks: asksUnsorted,
    });
    return {
      ...sortedOb,
      bids: sortedOb.bids.slice(0, depth),
      asks: sortedOb.asks.slice(0, depth),
    };
  }

  protected findBestBid(pair: string) {
    const splitIndex = this.getSplitIndex(pair);
    return findBestBid(splitIndex, this.storedObsOrdered[pair]);
  }

  protected findBestAsk(pair: string) {
    const splitIndex = this.getSplitIndex(pair);
    return findBestAsk(splitIndex, this.storedObsOrdered[pair]);
  }

  getOrderBookWs(pair: string, depth: number = 25): OrderBookSchema | null {
    const dataRaw = this.storedObs[pair];
    if (!dataRaw) return null;
    const bidI = this.findBestBid(pair).i;
    const askI = this.findBestAsk(pair).i;
    const { bids, asks } = buildFromOrderedOb({ bidI, askI, depth, storedObsOrdered: this.storedObsOrdered[pair] });
    // temp
    const verifyWithOldMethod = false;
    if (verifyWithOldMethod && asks.length > 0 && bids.length > 0) {
      const oldOb = this.getOrderBookWsOld(pair, depth)!;
      if (oldOb.asks[0].r !== asks[0].r) {
        console.error(
          `unmatching ob asks`,
          { oldAsks: oldOb.asks, oldbids: oldOb.bids, asks, bids },
          this.storedObsOrdered[pair],
          this.storedObs[pair],
        );
        process.exit(1);
      }
      if (oldOb.bids[0].r !== bids[0].r) {
        console.error(`unmatching ob bids`, { oldAsks: oldOb.asks, oldbids: oldOb.bids, bids, asks });
      }
    }
    return {
      pair,
      ts: this.lastObWsTime!.getTime(),
      bids,
      asks,
    };
  }

  getSplitIndex(pair: string) {
    if (!this.currentSplitIndex[pair]) {
      return Math.floor(this.storedObsOrdered[pair].length / 2);
    }
    return this.currentSplitIndex[pair];
  }

  async pollOrderBook(pairEx: string): Promise<OrderBookSchema> {
    return (await this.bybitRequest.pollOrderBook(pairEx)) as any;
  }

  // Get WS ob, and fall back to poll. also verify ws ob with poll ob
  async getOrderBook(pairEx: string, forcePoll?: boolean): Promise<OrderBookSchema> {
    if (forcePoll || !isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
      if (!forcePoll)
        this.logger.warn(
          `lastObWsTime=${this.lastObWsTime && this.lastObWsTime.toISOString()} is outdated diff=(${Date.now() -
            (this.lastObWsTime ? this.lastObWsTime.getTime() : 0)}), polling instead`,
        );
      return await this.pollOrderBookWithRateLimit(pairEx);
    }
    let obPoll;

    const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
    if (verifyWithPoll) {
      obPoll = await this.pollOrderBookWithRateLimit(pairEx);
    }

    const obFromRealtime = this.getOrderBookWs(pairEx);

    if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
      if (verifyWithPoll) {
        verifyObPollVsObWs(obPoll, obFromRealtime);
      }
      return obFromRealtime;
    }

    this.logger.warn(`orderbookws not available, polling instead obWs=${obFromRealtime}`);
    if (obPoll) {
      return obPoll;
    }
    return await this.pollOrderBookWithRateLimit(pairEx);
  }
}
