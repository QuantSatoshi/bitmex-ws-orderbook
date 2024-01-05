"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhemexObKeeper = exports.phemexToStandardOb = void 0;
const genericObKeeper_1 = require("./genericObKeeper");
function phemexToStandardOb(v) {
    return { r: v[0] / 10000, a: v[1] };
}
exports.phemexToStandardOb = phemexToStandardOb;
class PhemexObKeeper extends genericObKeeper_1.GenericObKeeper {
    onSocketMessage(msg) {
        try {
            const res = typeof msg === 'string' ? JSON.parse(msg) : msg;
            const { book, symbol, type } = res;
            if (book) {
                this.onReceiveObRaw({
                    pair: symbol,
                    book,
                    type,
                });
            }
        }
        catch (e) {
            this.logger.error('onSocketMessage', e);
        }
    }
    onReceiveObRaw(params) {
        this.onReceiveOb({
            pair: params.pair,
            bids: params.book.bids.map(phemexToStandardOb),
            asks: params.book.asks.map(phemexToStandardOb),
            isNewSnapshot: params.type === 'snapshot',
        });
    }
}
exports.PhemexObKeeper = PhemexObKeeper;
