const BITMEX_ID_TO_PRICE_CONVERSION = {
  ETH: [29700000000, 20],
  BTC: [8800000000, 100],
};

export function idToPrice(symbol: 'BTC' | 'ETH', id: number) {
  const [ID_ZERO, ID_DELTA] = BITMEX_ID_TO_PRICE_CONVERSION[symbol];
  let idZeroNew = ID_ZERO;
  while (id > idZeroNew) {
    idZeroNew += 1000000;
  }
  const price = (idZeroNew - id) / ID_DELTA;
  return +price.toFixed(2);
}
