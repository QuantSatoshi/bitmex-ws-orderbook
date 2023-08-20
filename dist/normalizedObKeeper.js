"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NormalizedObKeeper = exports.normalizedObToStandardOb = void 0;
const genericObKeeper_1 = require("./genericObKeeper");
const _ = __importStar(require("lodash"));
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
                isNewSnapshot: data.e === 's',
                pair: pair || data.pair || data.c.toString(),
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
