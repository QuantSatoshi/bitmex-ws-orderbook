"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizedObKeeper = exports.normalizedObToStandardObStr = exports.normalizedObToStandardOb = void 0;
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
function normalizedObToStandardObStr(v) {
    return { r: parseFloat(v[0]), a: parseFloat(v[1]) };
}
exports.normalizedObToStandardObStr = normalizedObToStandardObStr;
class NormalizedObKeeper extends genericObKeeper_1.GenericObKeeper {
    onData(data, pair) {
        try {
            const isString = data.b && data.b[0] ? typeof data.b[0][0] === 'string' : typeof (data.a && data.a[0] && data.a[0][0]) === 'string';
            const converter = isString ? normalizedObToStandardObStr : normalizedObToStandardOb;
            this.onReceiveOb({
                isNewSnapshot: data.e && data.e[0] === 's',
                pair: pair || data.pair || data.c.toString(),
                bids: data.b ? data.b.map(converter) : [],
                asks: data.a ? data.a.map(converter) : [],
            });
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.NormalizedObKeeper = NormalizedObKeeper;
