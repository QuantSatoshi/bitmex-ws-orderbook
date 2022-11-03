"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizedObKeeper = exports.normalizedObToStandardOb = void 0;
const genericObKeeper_1 = require("./genericObKeeper");
const _ = require("lodash");
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
    onData(data) {
        try {
            this.onReceiveOb({
                isNewSnapshot: data.e === 's',
                pair: data.pair || data.c.toString(),
                bids: _.map(data.b, normalizedObToStandardOb),
                asks: _.map(data.a, normalizedObToStandardOb),
            });
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.NormalizedObKeeper = NormalizedObKeeper;
