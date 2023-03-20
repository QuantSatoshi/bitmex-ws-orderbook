VERSION=$(git rev-parse HEAD)
echo $VERSION

gsed -i "s/bitmex-ws-orderbook\.git#.*\"/bitmex-ws-orderbook\.git#${VERSION}\"/g" ../bitmex_hf/package.json
gsed -i "s/bitmex-ws-orderbook\.git#.*\"/bitmex-ws-orderbook\.git#${VERSION}\"/g" ../bitmex_hf/yarn.lock

gsed -i "s/bitmex-ws-orderbook\.git#.*\"/bitmex-ws-orderbook\.git#${VERSION}\"/g" ../ex-core/package.json
gsed -i "s/bitmex-ws-orderbook\.git#.*\"/bitmex-ws-orderbook\.git#${VERSION}\"/g" ../ex-core/yarn.lock
