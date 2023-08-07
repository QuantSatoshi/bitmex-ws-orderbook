import { OrderBookSchema, OrderBookItem } from 'qs-typings';
import { BaseKeeper } from './baseKeeper';
import { GenericObKeeperShared } from './utils/genericObKeeperShared';

export namespace GeneticObKeeper {
  export interface Options {
    enableEvent?: boolean;
  }
}

export class GenericObKeeper extends BaseKeeper {
  obKeepers: Record<string, GenericObKeeperShared> = {};

  // if initial, return true
  onReceiveOb(params: { pair: string; bids: OrderBookItem[]; asks: OrderBookItem[]; isNewSnapshot?: boolean }) {
    const { pair, isNewSnapshot } = params;
    if (!this.obKeepers[pair]) {
      this.obKeepers[pair] = new GenericObKeeperShared();
    }
    if (isNewSnapshot) {
      this.obKeepers[pair].init();
    }
    const bids = this.maxLevels ? params.bids.slice(0, this.maxLevels) : params.bids;
    const asks = this.maxLevels ? params.asks.slice(0, this.maxLevels) : params.asks;
    this.obKeepers[pair].onReceiveOb({ bids, asks });

    this.emitOrderbookEvent(pair);
  }

  onReceiveTick(pair:string, tick: number[]) {
    this.obKeepers[pair].onReceiveTick(tick);
    this.emitOrderbookEvent(pair);
  }

  emitOrderbookEvent(pair: string) {
    if (this.enableEvent) {
      const now = Date.now();
      // only emit event at certain gap. prevent emitting even take over full cpu usage
      if (!this.lastEventTsMap[pair] || now - this.lastEventTsMap[pair] > this.minObEventGapMs) {
        this.lastEventTsMap[pair] = now;
        this.emit(`orderbook`, this.getOrderBookWs(pair));
      }
    }
  }

  getOrderBookWs(pair: string, depth?: number): OrderBookSchema {
    if (!this.obKeepers[pair]) {
      return {
        ts: Date.now(),
        pair,
        bids: [],
        asks: [],
      };
    }

    const orderbooks: OrderBookSchema = {
      ts: Date.now(),
      pair,
      ...this.obKeepers[pair].getOb(depth),
    };
    return orderbooks;
  }

  // fallback polling not implmented
  async getOrderBook(pair: string) {
    return this.getOrderBookWs(pair);
  }

  onOrderBookUpdated(callback: (ob: OrderBookSchema) => any) {
    this.on('orderbook', callback);
  }
}
