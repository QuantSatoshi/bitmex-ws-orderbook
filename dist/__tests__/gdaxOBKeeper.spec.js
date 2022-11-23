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
const gdaxObKeeper_1 = require("../gdaxObKeeper");
const _ = __importStar(require("lodash"));
describe('gdax ob keeper', () => {
    const pair = 'USD_BTC';
    const obInitial = {
        type: 'snapshot',
        product_id: pair,
        bids: [
            ['152.46', '40.50152043'],
            ['152.35', '0.68514292'],
            ['152.34', '11.3'],
            ['152.32', '13'],
        ],
        asks: [
            ['152.48', '8.18084404'],
            ['152.49', '14.31512963'],
            ['152.5', '25.52159388'],
            ['152.51', '6'],
            ['152.53', '70'],
        ],
    };
    it(`works with replacing`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(_.omit(keeper.getOrderBookWs(pair), 'ts')).toMatchSnapshot();
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['sell', '152.51', '12']] });
        expect(keeper.getOrderBookWs(pair).asks[3]).toEqual({ r: 152.51, a: 12 });
    });
    it(`works with inserting ask`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).asks.length).toBe(obInitial.asks.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['sell', '152.52', '12']] });
        expect(keeper.getOrderBookWs(pair).asks[4]).toEqual({ r: 152.52, a: 12 });
        expect(keeper.getOrderBookWs(pair).asks.length).toBe(obInitial.asks.length + 1);
    });
    it(`works with inserting ask at last`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).asks.length).toBe(obInitial.asks.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['sell', '154.52', '12']] });
        expect(keeper.getOrderBookWs(pair).asks[5]).toEqual({ r: 154.52, a: 12 });
        expect(keeper.getOrderBookWs(pair).asks.length).toBe(obInitial.asks.length + 1);
    });
    it(`works with inserting ask at top`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).asks.length).toBe(obInitial.asks.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['sell', '152.47', '12']] });
        expect(keeper.getOrderBookWs(pair).asks[0]).toEqual({ r: 152.47, a: 12 });
        expect(keeper.getOrderBookWs(pair).asks.length).toBe(obInitial.asks.length + 1);
    });
    it(`works with inserting bid`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['buy', '152.33', '12']] });
        expect(keeper.getOrderBookWs(pair).bids[3]).toEqual({ r: 152.33, a: 12 });
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length + 1);
    });
    it(`works with inserting bid at last`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['buy', '151.52', '12']] });
        expect(keeper.getOrderBookWs(pair).bids[4]).toEqual({ r: 151.52, a: 12 });
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length + 1);
    });
    it(`works with inserting bid at top`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['buy', '152.47', '12']] });
        expect(keeper.getOrderBookWs(pair).bids[0]).toEqual({ r: 152.47, a: 12 });
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length + 1);
    });
    it(`works with deleting bid`, () => {
        const keeper = new gdaxObKeeper_1.GdaxObKeeper({});
        keeper.onSocketMessage(obInitial);
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length);
        keeper.onSocketMessage({ type: 'l2update', product_id: pair, changes: [['buy', '152.34', '0']] });
        expect(keeper.getOrderBookWs(pair).bids[2]).toEqual({ r: 152.32, a: 13 });
        expect(keeper.getOrderBookWs(pair).bids.length).toBe(obInitial.bids.length - 1);
    });
});
