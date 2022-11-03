import { OrderBookItem } from 'bitmex-request/dist/sharedTypes';
export declare class GenericObKeeperShared {
    protected bids: OrderBookItem[];
    protected asks: OrderBookItem[];
    init(): void;
    onReceiveOb(params: {
        bids: OrderBookItem[];
        asks: OrderBookItem[];
    }): void;
    getOb(depth?: number): {
        asks: OrderBookItem[];
        bids: OrderBookItem[];
    };
}
