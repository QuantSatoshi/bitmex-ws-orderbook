import { InternalOb } from '../types/shared.type';
import { OrderBookItem } from "qs-typings";
export declare function findBestBid(splitIndex: number, storedObsOrdered: InternalOb[]): {
    i: number;
    bid: InternalOb;
};
export declare function findBestAsk(splitIndex: number, storedObsOrdered: InternalOb[]): {
    i: number;
    ask: InternalOb;
};
export declare function buildFromOrderedOb(params: {
    bidI: number;
    askI: number;
    storedObsOrdered: InternalOb[];
    depth: number;
}): {
    bids: OrderBookItem[];
    asks: OrderBookItem[];
};
export declare function reverseBuildIndex(storedObsOrdered: InternalOb[], storedObs: Record<string, InternalOb>): void;
