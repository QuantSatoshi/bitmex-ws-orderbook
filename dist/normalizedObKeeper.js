"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizedObKeeper = exports.normalizedObToStandardOb = void 0;
const genericObKeeper_1 = require("./genericObKeeper");
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
function normalizedObToStandardOb(v) {
    return { r: v[0], a: v[1] };
}
exports.normalizedObToStandardOb = normalizedObToStandardOb;
class NormalizedObKeeper extends genericObKeeper_1.GenericObKeeper {
    onData(data, pair) {
        try {
            this.onReceiveOb({
                isNewSnapshot: data.e && data.e[0] === 's',
                pair: pair || data.pair || data.c.toString(),
                bids: data.b ? data.b.map(normalizedObToStandardOb) : [],
                asks: data.a ? data.a.map(normalizedObToStandardOb) : [],
            });
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.NormalizedObKeeper = NormalizedObKeeper;
