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
exports.reverseBuildIndex = exports.buildFromOrderedOb = exports.findBestAsk = exports.findBestBid = void 0;
const _ = __importStar(require("lodash"));
function findBestBid(splitIndex, storedObsOrdered) {
    let i = splitIndex;
    if (!storedObsOrdered[i]) {
        throw new Error(`findBestBid invalid splitIndex=${i} storedObsOrdered.length=${storedObsOrdered.length}`);
    }
    if (storedObsOrdered[i].a === 0) {
        // is this deleted item, start from top
        i = 0;
    }
    const sideSplit = storedObsOrdered[i].s;
    if (i === 0 || sideSplit === 0) {
        // go down until we see Sell
        while (i < storedObsOrdered.length && (storedObsOrdered[i].s === 0 || storedObsOrdered[i].a === 0)) {
            i++;
        }
        return { i: i - 1, bid: storedObsOrdered[i - 1] };
    }
    else {
        // go up until we see first buy
        while (i > 0 && (storedObsOrdered[i].s === 1 || storedObsOrdered[i].a === 0)) {
            i--;
        }
        return { i: i, bid: storedObsOrdered[i] };
    }
}
exports.findBestBid = findBestBid;
function findBestAsk(splitIndex, storedObsOrdered) {
    let i = splitIndex;
    let lastIndex = storedObsOrdered.length - 1;
    if (!storedObsOrdered[i]) {
        throw new Error(`findBestAsk invalid splitIndex=${i}`);
    }
    if (storedObsOrdered[i].a === 0) {
        // is this deleted item, start from bottom
        i = lastIndex;
    }
    const sideSplit = storedObsOrdered[i].s;
    if (i !== lastIndex && (sideSplit === 0 || storedObsOrdered[i].a === 0)) {
        // go down until we see Sell
        while (i < storedObsOrdered.length && (storedObsOrdered[i].s === 0 || storedObsOrdered[i].a === 0)) {
            i++;
        }
        return { i: i, ask: storedObsOrdered[i] };
    }
    else {
        // go up until we see first buy
        while (i >= 0 && (storedObsOrdered[i].s === 1 || storedObsOrdered[i].a === 0)) {
            i--;
        }
        return { i: i + 1, ask: storedObsOrdered[i + 1] };
    }
}
exports.findBestAsk = findBestAsk;
function buildFromOrderedOb(params) {
    const { bidI, askI, storedObsOrdered, depth } = params;
    const asks = [];
    const bids = [];
    for (let i = bidI; i >= 0 && bids.length < depth; i--) {
        const item = storedObsOrdered[i];
        if (item.a > 0) {
            bids.push({
                r: item.r,
                a: item.a,
            });
        }
    }
    for (let i = askI; i < storedObsOrdered.length && asks.length < depth; i++) {
        const item = storedObsOrdered[i];
        if (item.a > 0) {
            asks.push({
                r: item.r,
                a: item.a,
            });
        }
    }
    return { bids, asks };
}
exports.buildFromOrderedOb = buildFromOrderedOb;
function reverseBuildIndex(storedObsOrdered, storedObs) {
    _.each(storedObsOrdered, (o, i) => {
        // undefined is allowed due to it can be deleted
        if (storedObs[String(o.id)]) {
            storedObs[String(o.id)].idx = i;
        }
    });
}
exports.reverseBuildIndex = reverseBuildIndex;
