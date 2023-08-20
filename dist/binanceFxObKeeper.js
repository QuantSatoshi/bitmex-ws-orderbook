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
exports.BinanceFxObKeeper = exports.binanceObToStandardOb = void 0;
const genericObKeeper_1 = require("./genericObKeeper");
const _ = __importStar(require("lodash"));
const autoParseFloat = (v) => (_.isString(v) ? parseFloat(v) : v);
function binanceObToStandardOb(v) {
    return { r: autoParseFloat(v[0]), a: autoParseFloat(v[1]) };
}
exports.binanceObToStandardOb = binanceObToStandardOb;
class BinanceFxObKeeper extends genericObKeeper_1.GenericObKeeper {
    onSocketMessage(data, pairDb) {
        try {
            // data.e == u is internal db format
            if (data.e === 'depthUpdate' || data.e == 'u') {
                // some delete are always in bid, but should be in ask instead
                // bids ordered from low to high, worst to best
                let b = data.b ? data.b.reverse() : [];
                let a = data.a ? data.a : [];
                if (this.maxLevels) {
                    b = b.slice(0, this.maxLevels);
                    a = a.slice(0, this.maxLevels);
                }
                const bids = b.map(binanceObToStandardOb);
                // asks ordered from high to low, best to worst
                const asks = a.map(binanceObToStandardOb);
                const pair = pairDb || data.s.toUpperCase();
                const currentOb = this.getOrderBookWs(pair);
                for (let bid of bids) {
                    if (currentOb.asks[0] && bid.a === 0 && bid.r >= currentOb.asks[0].r) {
                        asks.unshift(bid);
                        // console.log(`BinanceFxObKeeper moving bid ${JSON.stringify(bid)} to ask topAsk=${currentOb.asks[0].r}`);
                    }
                    else if (currentOb.asks[0] && bid.r < currentOb.asks[0].r) {
                        break;
                    }
                }
                for (let ask of asks) {
                    if (currentOb.bids[0] && ask.a === 0 && ask.r <= currentOb.bids[0].r) {
                        bids.push(ask);
                        // console.log(`BinanceFxObKeeper moving ask ${JSON.stringify(ask)} to bid topBid=${currentOb.bids[0].r}`);
                    }
                    else if (currentOb.bids[0] && ask.r > currentOb.bids[0].r) {
                        break;
                    }
                }
                this.onReceiveOb({
                    pair,
                    bids,
                    asks,
                });
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
}
exports.BinanceFxObKeeper = BinanceFxObKeeper;
