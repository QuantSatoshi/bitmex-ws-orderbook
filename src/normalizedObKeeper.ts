import { OrderBookItem, ObStreamShared } from 'qs-typings';
import { GenericObKeeper } from './genericObKeeper';

/*
{
  "e": "depthUpdate", // Event type
  "E": 123456789,     // Event time
  "T": 123456788,     // transaction time
  "s": "BTCUSDT",      // Symbol
  "U": 157,           // first update Id from last stream
  "u": 160,           // last update Id from last stream
  "pu": 149,          // last update Id in last stream（ie ‘u’ in last stream）
  "b": [              // Bids to be updated
    [
      "0.0024",       // Price level to be updated
      "10"            // Quantity
    ]
  ],
  "a": [              // Asks to be updated
    [
      "0.0026",       // Price level to be updated
      "100"          // Quantity
    ]
  ]
}
 */

export function normalizedObToStandardOb(v: number[]): OrderBookItem {
  return { r: v[0], a: v[1] };
}

export class NormalizedObKeeper extends GenericObKeeper {
  onData(data: ObStreamShared, pair?: string) {
    try {
      this.onReceiveOb({
        isNewSnapshot: data.e === 's',
        pair: pair || data.pair || data.c.toString(),
        bids: data.b ? data.b.map(normalizedObToStandardOb) : [],
        asks: data.a ? data.a.map(normalizedObToStandardOb) : [],
      });
    } catch (e) {
      this.logger.error('onSocketMessage', e);
    }
  }
}
