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
exports.GenericObKeeperShared = void 0;
const _ = __importStar(require("lodash"));
const searchUtils_1 = require("qs-js-utils/dist/utils/searchUtils");
class GenericObKeeperShared {
    constructor() {
        // TODO: in c++ change storage to be plain array
        this.bids = [];
        this.asks = [];
    }
    init() {
        this.bids = [];
        this.asks = [];
    }
    // assume bids and asks are both ordered from best to worst
    onReceiveOb(params) {
        // deal with special cases, the bid cannot be greater than ask.
        if (params.asks.length > 0) {
            const firstNonZeroAsk = _.find(params.asks, x => x.a > 0);
            while (firstNonZeroAsk && this.bids.length > 0 && this.bids[0].r >= firstNonZeroAsk.r) {
                this.bids.splice(0, 1);
            }
        }
        if (params.bids.length > 0) {
            const firstNonZeroBid = _.find(params.bids, bid => bid.a > 0);
            while (firstNonZeroBid && this.asks.length > 0 && this.asks[0].r <= firstNonZeroBid.r) {
                this.asks.splice(0, 1);
            }
        }
        for (let bid of params.bids) {
            if (!bid || !bid.r || isNaN(bid.r)) {
                console.error(`onReceiveOb invalid bid`, bid);
                continue;
            }
            if (this.bids.length === 0) {
                // insert if empty
                if (bid.a > 0) {
                    this.bids.push(bid);
                }
            }
            else {
                // if bid is too low than whole book, push at bottom
                if (bid.r < _.last(this.bids).r) {
                    bid.a > 0 && this.bids.push(bid);
                }
                else if (bid.r > _.first(this.bids).r) {
                    bid.a > 0 && this.bids.unshift(bid);
                }
                else {
                    const foundIndex = (0, searchUtils_1.sortedFindFirstSmallerEqual)(this.bids, bid.r, b => b.r);
                    if (foundIndex === -1) {
                        console.error(`invalid condition, did not found index bid`, bid, this.bids);
                    }
                    else {
                        if (this.bids[foundIndex].r === bid.r) {
                            if (bid.a === 0) {
                                // delete
                                this.bids.splice(foundIndex, 1);
                            }
                            else {
                                // replace
                                this.bids[foundIndex] = bid;
                            }
                        }
                        else {
                            // insert if the price is not equal, and amount > 0
                            if (bid.a > 0) {
                                this.bids.splice(foundIndex, 0, bid);
                            }
                        }
                    }
                }
            }
        }
        for (let ask of params.asks) {
            if (!ask || !ask.r || isNaN(ask.r)) {
                console.error(`onReceiveOb invalid ask`, ask);
                continue;
            }
            // ask ordered from best to worst, from lowest to highest.
            if (this.asks.length === 0) {
                this.asks.push(ask);
            }
            else {
                if (ask.r > _.last(this.asks).r) {
                    ask.a > 0 && this.asks.push(ask);
                }
                else if (ask.r < _.first(this.asks).r) {
                    ask.a > 0 && this.asks.unshift(ask);
                }
                else {
                    const foundIndex = (0, searchUtils_1.sortedFindFirstGreaterEqual)(this.asks, ask.r, a => a.r);
                    if (foundIndex === -1) {
                        console.error(`invalid condition, did not found index ask`, ask, this.asks);
                    }
                    else {
                        if (this.asks[foundIndex].r === ask.r) {
                            if (ask.a === 0) {
                                // delete
                                this.asks.splice(foundIndex, 1);
                            }
                            else {
                                // replace
                                this.asks[foundIndex] = ask;
                            }
                        }
                        else {
                            // insert
                            if (ask.a > 0) {
                                this.asks.splice(foundIndex, 0, ask);
                            }
                        }
                    }
                }
            }
        }
    }
    getOb(depth) {
        return { asks: depth ? this.asks.slice(0, depth) : this.asks, bids: depth ? this.bids.slice(0, depth) : this.bids };
    }
    onReceiveTick(tick) {
        const bidNew = tick[1];
        const askNew = tick[2];
        const bidVol = tick[3];
        const askVol = tick[4];
        let found = false;
        for (let i = 0; i < this.bids.length; i++) {
            // remove all bids that's higher than the bidNew
            if (this.bids[i].r < bidNew && i !== 0) {
                found = true;
                this.bids = [{ r: bidNew, a: bidVol }].concat(this.bids.slice(i));
            }
        }
        if (!found) {
            this.bids = [{ r: bidNew, a: bidVol }];
        }
        found = false;
        for (let i = 0; i < this.asks.length; i++) {
            // remove all asks that's lower than the askNew
            if (this.asks[i].r > askNew && i !== 0) {
                found = true;
                this.asks = [{ r: askNew, a: askVol }].concat(this.asks.slice(i));
            }
        }
        if (!found) {
            this.asks = [{ r: askNew, a: askVol }];
        }
    }
}
exports.GenericObKeeperShared = GenericObKeeperShared;
