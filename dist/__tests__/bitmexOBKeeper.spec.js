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
const bitmexOrderBookKeeper_1 = require("../bitmexOrderBookKeeper");
const bitmexObRaw = require('./bitmexObRaw.json');
const _ = __importStar(require("lodash"));
describe('bitmex ob keeper', () => {
    const pair = 'USD_BTC_perpetual_swap';
    const obs = [
        {
            action: 'partial',
            data: [
                { id: 8700000201, side: 'Sell', size: 3, price: 7002 },
                { id: 8716991251, side: 'Sell', size: 21, price: 7001 },
                { id: 8716991250, side: 'Buy', size: 26, price: 7000.5 },
                { id: 8700000200, side: 'Buy', size: 5, price: 7000 },
            ],
        },
        {
            action: 'update',
            data: [{ id: 8716991250, side: 'Sell', size: 23063 }],
        },
        {
            action: 'delete',
            data: [{ id: 8700000201 }],
        },
    ];
    it(`works with partial`, () => {
        const keeper = new bitmexOrderBookKeeper_1.BitmexOrderBookKeeper({});
        keeper.onReceiveOb(obs[0].data, obs[0].action, pair);
        expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
    });
    it(`works with update`, () => {
        const keeper = new bitmexOrderBookKeeper_1.BitmexOrderBookKeeper({});
        keeper.onReceiveOb(obs[0].data, obs[0].action, pair);
        keeper.onReceiveOb(obs[1].data, obs[1].action, pair);
        expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
    });
    it(`works with delete`, () => {
        const keeper = new bitmexOrderBookKeeper_1.BitmexOrderBookKeeper({});
        keeper.onReceiveOb(obs[0].data, obs[0].action, pair);
        keeper.onReceiveOb(obs[2].data, obs[2].action, pair);
        expect(keeper.getOrderBookWs(pair)).toMatchSnapshot();
    });
    it('raw ob works', () => {
        const keeper = new bitmexOrderBookKeeper_1.BitmexOrderBookKeeper({});
        _.each(bitmexObRaw, ob => {
            keeper.onReceiveOb(ob.data, ob.action, pair);
        });
        expect(keeper.getOrderBookWs(pair)).toEqual(keeper.getOrderBookWsOld(pair));
    });
});
