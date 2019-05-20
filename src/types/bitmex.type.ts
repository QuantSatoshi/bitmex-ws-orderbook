declare namespace Bitmex {
  type BitmexSide = 'Sell' | 'Buy';

  interface OBRow {
    symbol: string;
    id: number;
    side: BitmexSide;
    price: number;
    size: number;
  }

  interface BitmexOrderBookItem {
    symbol: string;
    id: number;
    side: BitmexSide;
    size: number; // Size is in USD
    price: number;
  }

  interface OrderBookItem {
    a: number;
    r: number;
  }

  interface OrderBookSchema {
    ts: Date;
    pair?: string;
    bids: OrderBookItem[];
    asks: OrderBookItem[];
  }

  type BitmexOrderBooks = BitmexOrderBookItem[];
}
