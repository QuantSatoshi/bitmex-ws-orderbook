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
const bybitOrderBookKeeper_1 = require("../bybitOrderBookKeeper");
const bybitOrderBookKeeperOld_1 = require("../bybitOrderBookKeeperOld");
const bybitObRaw = require('./bybitObRaw.json');
const _ = __importStar(require("lodash"));
describe('bitmex ob keeper', () => {
    let keeper;
    const pair = 'USD_BTC_perpetual_swap';
    const obs = [
        {
            type: 'snapshot',
            data: [
                { id: 8700000201, side: 'Sell', size: 3, price: 7002 },
                { id: 8716991251, side: 'Sell', size: 21, price: 7001 },
                { id: 8716991250, side: 'Buy', size: 26, price: 7000.5 },
                { id: 8700000200, side: 'Buy', size: 5, price: 7000 },
            ],
        },
        {
            type: 'delta',
            data: {
                update: [{ id: 8716991250, side: 'Sell', size: 23063, price: 7000.5 }],
                delete: [{ id: 8700000201, price: 7002 }],
            },
        },
        {
            type: 'delta',
            data: {
                insert: [{ id: 8716991202, side: 'Sell', size: 222, price: 7003 }],
            },
        },
    ];
    beforeEach(() => {
        keeper = new bybitOrderBookKeeper_1.BybitOrderBookKeeper({});
    });
    it(`works with snapshot`, () => {
        keeper.onReceiveOb(obs[0], pair);
        const ob = keeper.getOrderBookWs(pair);
        delete ob.ts;
        expect(ob).toMatchSnapshot();
    });
    it(`works with update and delete`, () => {
        keeper.onReceiveOb(obs[0], pair);
        keeper.onReceiveOb(obs[1], pair);
        const ob = keeper.getOrderBookWs(pair);
        delete ob.ts;
        expect(ob).toMatchSnapshot();
    });
    it(`works with insert`, () => {
        keeper.onReceiveOb(obs[0], pair);
        keeper.onReceiveOb(obs[2], pair);
        const ob = keeper.getOrderBookWs(pair);
        delete ob.ts;
        expect(ob).toMatchSnapshot();
    });
    it('raw ob works', () => {
        const keeperOld = new bybitOrderBookKeeperOld_1.BybitOrderBookKeeper({});
        _.each(bybitObRaw, ob => {
            keeper.onReceiveOb(ob, pair);
            keeperOld.onReceiveOb(ob, pair);
        });
        expect(_.omit(keeper.getOrderBookWs(pair), 'ts')).toEqual(_.omit(keeperOld.getOrderBookWs(pair), 'ts'));
    });
});
