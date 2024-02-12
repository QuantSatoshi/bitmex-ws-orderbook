import { OrderBookItem, ObStreamShared } from 'qs-typings';
import { GenericObKeeper } from './genericObKeeper';
export declare function normalizedObToStandardOb(v: number[]): OrderBookItem;
export declare function normalizedObToStandardObStr(v: any[]): OrderBookItem;
export declare class NormalizedObKeeper extends GenericObKeeper {
    onData(data: ObStreamShared, pair?: string): void;
}
