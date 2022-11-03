import { BybitOrderBookKeeper } from '../bybitOrderBookKeeper';
import { BybitOrderBookKeeper as BybitOrderBookKeeperOld } from '../bybitOrderBookKeeperOld';
const bybitObRaw = require('./bybitObRaw.json');
import * as _ from 'lodash';

describe('bitmex ob keeper', () => {
  let keeper: BybitOrderBookKeeper;
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
    keeper = new BybitOrderBookKeeper({});
  });

  it(`works with snapshot`, () => {
    keeper.onReceiveOb(obs[0] as any, pair);
    const ob = keeper.getOrderBookWs(pair);
    delete (ob as any).ts;
    expect(ob).toMatchSnapshot();
  });

  it(`works with update and delete`, () => {
    keeper.onReceiveOb(obs[0] as any, pair);
    keeper.onReceiveOb(obs[1] as any, pair);
    const ob = keeper.getOrderBookWs(pair);
    delete (ob as any).ts;
    expect(ob).toMatchSnapshot();
  });

  it(`works with insert`, () => {
    keeper.onReceiveOb(obs[0] as any, pair);
    keeper.onReceiveOb(obs[2] as any, pair);
    const ob = keeper.getOrderBookWs(pair);
    delete (ob as any).ts;
    expect(ob).toMatchSnapshot();
  });

  it('raw ob works', () => {
    const keeperOld = new BybitOrderBookKeeperOld({});
    _.each(bybitObRaw, ob => {
      keeper.onReceiveOb(ob, pair);
      keeperOld.onReceiveOb(ob, pair);
    });
    expect(_.omit(keeper.getOrderBookWs(pair), 'ts')).toEqual(_.omit(keeperOld.getOrderBookWs(pair), 'ts'));
  });
});
