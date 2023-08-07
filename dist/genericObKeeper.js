"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericObKeeper = void 0;
const baseKeeper_1 = require("./baseKeeper");
const genericObKeeperShared_1 = require("./utils/genericObKeeperShared");
class GenericObKeeper extends baseKeeper_1.BaseKeeper {
    constructor() {
        super(...arguments);
        this.obKeepers = {};
    }
    // if initial, return true
    onReceiveOb(params) {
        const { pair, isNewSnapshot } = params;
        if (!this.obKeepers[pair]) {
            this.obKeepers[pair] = new genericObKeeperShared_1.GenericObKeeperShared();
        }
        if (isNewSnapshot) {
            this.obKeepers[pair].init();
        }
        const bids = this.maxLevels ? params.bids.slice(0, this.maxLevels) : params.bids;
        const asks = this.maxLevels ? params.asks.slice(0, this.maxLevels) : params.asks;
        this.obKeepers[pair].onReceiveOb({ bids, asks });
        this.emitOrderbookEvent(pair);
    }
    onReceiveTick(pair, tick) {
        this.obKeepers[pair].onReceiveTick(tick);
        this.emitOrderbookEvent(pair);
    }
    emitOrderbookEvent(pair) {
        if (this.enableEvent) {
            const now = Date.now();
            // only emit event at certain gap. prevent emitting even take over full cpu usage
            if (!this.lastEventTsMap[pair] || now - this.lastEventTsMap[pair] > this.minObEventGapMs) {
                this.lastEventTsMap[pair] = now;
                this.emit(`orderbook`, this.getOrderBookWs(pair));
            }
        }
    }
    getOrderBookWs(pair, depth) {
        if (!this.obKeepers[pair]) {
            return {
                ts: Date.now(),
                pair,
                bids: [],
                asks: [],
            };
        }
        const orderbooks = Object.assign({ ts: Date.now(), pair }, this.obKeepers[pair].getOb(depth));
        return orderbooks;
    }
    // fallback polling not implmented
    getOrderBook(pair) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getOrderBookWs(pair);
        });
    }
    onOrderBookUpdated(callback) {
        this.on('orderbook', callback);
    }
}
exports.GenericObKeeper = GenericObKeeper;
