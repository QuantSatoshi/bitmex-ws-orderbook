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
exports.BybitOrderBookKeeper = void 0;
const _ = require("lodash");
const bitmex_request_1 = require("bitmex-request");
const qsJsUtils = require("qs-js-utils");
const parsingUtils_1 = require("./utils/parsingUtils");
const baseKeeper_1 = require("./baseKeeper");
const orderdOrderbookUtils_1 = require("./utils/orderdOrderbookUtils");
const { searchUtils } = qsJsUtils;
class BybitOrderBookKeeper extends baseKeeper_1.BaseKeeper {
    constructor(options) {
        super(options);
        this.storedObs = {};
        this.storedObsOrdered = {};
        this.currentSplitIndex = {};
        this.name = 'bybitObKeeper';
        this.VERIFY_OB_PERCENT = 0.1;
        this.VALID_OB_WS_GAP = 20 * 1000;
        this.testnet = options.testnet || false;
        this.bybitRequest = new bitmex_request_1.BybitRequest({ testnet: this.testnet });
        this.initLogger();
    }
    // either parsed object or raw text
    onSocketMessage(msg) {
        try {
            const res = _.isString(msg) ? JSON.parse(msg) : msg;
            const pairMatch = res && res.topic.match(/^orderBookL2_25\.(.*)/);
            const pair = pairMatch && pairMatch[1];
            if (pair) {
                this.storedObs[pair] = this.storedObs[pair] || {};
                this.lastObWsTime = new Date();
                this.onReceiveOb(res);
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    toInternalOb(ob) {
        return {
            s: ob.side === 'Buy' ? 0 : 1,
            r: parseFloat(ob.price),
            a: ob.size,
            id: ob.id,
        };
    }
    searchAndInsertObRow(newRowRef, pair) {
        if (this.storedObsOrdered[pair].length === 0) {
            this.storedObsOrdered[pair].push(newRowRef);
        }
        else if (newRowRef.r > _.last(this.storedObsOrdered[pair]).r) {
            this.storedObsOrdered[pair].push(newRowRef);
        }
        else if (newRowRef.r < _.first(this.storedObsOrdered[pair]).r) {
            this.storedObsOrdered[pair].unshift(newRowRef);
        }
        else {
            // try to find the price using binary search first. slightly faster.
            const foundIndex = searchUtils.sortedFindIndex(this.storedObsOrdered[pair], newRowRef.r, x => x.r);
            if (foundIndex !== -1) {
                this.storedObsOrdered[pair][foundIndex] = newRowRef;
            }
            else {
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
    onReceiveOb(obs, _pair) {
        // for rebuilding orderbook process.
        if (_.includes(['snapshot'], obs.type)) {
            // first init, refresh ob data.
            const obRows = obs.data;
            const pair = _pair || obRows[0].symbol;
            // reset data
            if (pair) {
                this.storedObs[pair] = {};
                this.storedObsOrdered[pair] = [];
            }
            _.each(obRows, row => {
                const pair = _pair || row.symbol;
                const newRowRef = this.toInternalOb(row);
                this.storedObs[pair][String(row.id)] = newRowRef;
                this.searchAndInsertObRow(newRowRef, pair);
            });
            // reverse build index
            (0, orderdOrderbookUtils_1.reverseBuildIndex)(this.storedObsOrdered[pair], this.storedObs[pair]);
        }
        else if (obs.type === 'delta') {
            let pair = _pair;
            if (!_.isEmpty(obs.data.insert)) {
                pair = _pair || obs.data.insert[0].symbol;
                this.storedObs[pair] = this.storedObs[pair] || {};
                this.storedObsOrdered[pair] = this.storedObsOrdered[pair] || [];
            }
            _.each(obs.data.insert, row => {
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
            _.each(obs.data.update, row => {
                pair = _pair || row.symbol;
                if (this.storedObs[pair][String(row.id)]) {
                    // must update one by one because update doesn't contain price
                    const newRowRef = this.toInternalOb(row);
                    this.storedObs[pair][String(row.id)].a = newRowRef.a;
                    if (this.storedObs[pair][String(row.id)].s !== newRowRef.s) {
                        this.storedObs[pair][String(row.id)].s = newRowRef.s;
                        this.currentSplitIndex[pair] = this.storedObs[pair][String(row.id)].idx;
                    }
                }
                else {
                    // sometimes we cannot find the id, so we gotta to insert new
                    const newRowRef = this.toInternalOb(row);
                    this.storedObs[pair][String(row.id)] = newRowRef;
                    this.searchAndInsertObRow(newRowRef, pair);
                }
            });
            // reverse build index
            if (pair && !_.isEmpty(obs.data.insert)) {
                (0, orderdOrderbookUtils_1.reverseBuildIndex)(this.storedObsOrdered[pair], this.storedObs[pair]);
            }
            _.each(obs.data.delete, row => {
                pair = _pair || row.symbol;
                if (!this.storedObs[pair]) {
                    console.error(`invalid ob for pair ${pair}`, this.storedObs[pair]);
                }
                if (this.storedObs[pair][String(row.id)]) {
                    const idx = this.storedObs[pair][String(row.id)].idx;
                    this.storedObsOrdered[pair][idx].a = 0;
                    delete this.storedObs[pair][String(row.id)];
                }
            });
        }
        if (this.enableEvent) {
            this.emit(`orderbook`, this.getOrderBookWs(obs.topic.match(/orderBookL2_25\.(.*)/)[1]));
        }
    }
    getOrderBookWsOld(pair, depth = 25) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        const bidsUnsortedRaw = _.filter(dataRaw, o => o.s === 0 && o.a > 0);
        const askUnsortedRaw = _.filter(dataRaw, o => o.s === 1 && o.a > 0);
        const bidsUnsorted = _.map(bidsUnsortedRaw, d => ({ r: +d.r, a: d.a }));
        const asksUnsorted = _.map(askUnsortedRaw, d => ({ r: +d.r, a: d.a }));
        const sortedOb = (0, parsingUtils_1.sortOrderBooks)({
            pair,
            ts: this.lastObWsTime,
            bids: bidsUnsorted,
            asks: asksUnsorted,
        });
        return Object.assign(Object.assign({}, sortedOb), { bids: sortedOb.bids.slice(0, depth), asks: sortedOb.asks.slice(0, depth) });
    }
    findBestBid(pair) {
        const splitIndex = this.getSplitIndex(pair);
        return (0, orderdOrderbookUtils_1.findBestBid)(splitIndex, this.storedObsOrdered[pair]);
    }
    findBestAsk(pair) {
        const splitIndex = this.getSplitIndex(pair);
        return (0, orderdOrderbookUtils_1.findBestAsk)(splitIndex, this.storedObsOrdered[pair]);
    }
    getOrderBookWs(pair, depth = 25) {
        const dataRaw = this.storedObs[pair];
        if (!dataRaw)
            return null;
        const bidI = this.findBestBid(pair).i;
        const askI = this.findBestAsk(pair).i;
        const { bids, asks } = (0, orderdOrderbookUtils_1.buildFromOrderedOb)({ bidI, askI, depth, storedObsOrdered: this.storedObsOrdered[pair] });
        // temp
        const verifyWithOldMethod = false;
        if (verifyWithOldMethod && asks.length > 0 && bids.length > 0) {
            const oldOb = this.getOrderBookWsOld(pair, depth);
            if (_.get(oldOb.asks[0], 'r') !== asks[0].r) {
                console.error(`unmatching ob asks`, { oldAsks: oldOb.asks, oldbids: oldOb.bids, asks, bids }, this.storedObsOrdered[pair], this.storedObs[pair]);
                process.exit(1);
            }
            if (_.get(oldOb.bids[0], 'r') !== bids[0].r) {
                console.error(`unmatching ob bids`, { oldAsks: oldOb.asks, oldbids: oldOb.bids, bids, asks });
            }
        }
        return {
            pair,
            ts: this.lastObWsTime,
            bids,
            asks,
        };
    }
    getSplitIndex(pair) {
        if (!this.currentSplitIndex[pair]) {
            return Math.floor(this.storedObsOrdered[pair].length / 2);
        }
        return this.currentSplitIndex[pair];
    }
    pollOrderBook(pairEx) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.bybitRequest.pollOrderBook(pairEx);
        });
    }
    // Get WS ob, and fall back to poll. also verify ws ob with poll ob
    getOrderBook(pairEx, forcePoll) {
        return __awaiter(this, void 0, void 0, function* () {
            if (forcePoll || !qsJsUtils.isTimeWithinRange(this.lastObWsTime, this.VALID_OB_WS_GAP)) {
                if (!forcePoll)
                    this.logger.warn(`lastObWsTime=${this.lastObWsTime && this.lastObWsTime.toISOString()} is outdated diff=(${Date.now() -
                        (this.lastObWsTime ? this.lastObWsTime.getTime() : 0)}), polling instead`);
                return yield this.pollOrderBookWithRateLimit(pairEx);
            }
            let obPoll;
            const verifyWithPoll = Math.random() < this.VERIFY_OB_PERCENT;
            if (verifyWithPoll) {
                obPoll = yield this.pollOrderBookWithRateLimit(pairEx);
            }
            const obFromRealtime = this.getOrderBookWs(pairEx);
            if (obFromRealtime && obFromRealtime.bids.length > 0 && obFromRealtime.asks.length > 0) {
                if (verifyWithPoll) {
                    (0, parsingUtils_1.verifyObPollVsObWs)(obPoll, obFromRealtime);
                }
                return obFromRealtime;
            }
            this.logger.warn(`orderbookws not available, polling instead obWs=${obFromRealtime}`);
            if (obPoll) {
                return obPoll;
            }
            return yield this.pollOrderBookWithRateLimit(pairEx);
        });
    }
}
exports.BybitOrderBookKeeper = BybitOrderBookKeeper;
