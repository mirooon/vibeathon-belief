import { fetchOrderBook } from '../adapters/polymarket.client';
import { config } from '../config';
import { getOrderBookSnapshotModel, getVenueMarketModel } from '../schemas';

interface VenueMarketLean {
  sourceMarketId: string;
  logicalMarketId: string;
  clobTokenIds?: string[];
  outcomes?: Array<{ sourceOutcomeId: string; label: string }>;
}

export async function runOrderbookSync(): Promise<void> {
  console.log('[orderbook-sync] starting...');

  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'polymarket', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, clobTokenIds: 1, outcomes: 1, volume: 1 },
  ).sort({ volume: -1 }).limit(config.polyMaxMarkets).lean()) as unknown as VenueMarketLean[];

  console.log(`[orderbook-sync] processing ${markets.length} markets`);

  const OrderBookSnapshot = getOrderBookSnapshotModel();
  const timestamp = new Date();
  let count = 0;

  for (const vm of markets) {
    const tokenIds = vm.clobTokenIds ?? [];
    if (!tokenIds.length) continue;

    try {
      const outcomeBooks = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i]!;
        const book = await fetchOrderBook(tokenId);
        const sourceOutcomeId = vm.outcomes?.[i]?.sourceOutcomeId ?? tokenId;
        const canonicalOutcomeId = `${vm.logicalMarketId}-${i}`;

        // CLOB returns bids ascending and asks descending — normalize to standard
        // orderbook convention: bids descending (best first), asks ascending (best first).
        const bids = book.bids
          .map((b) => ({ price: parseFloat(b.price), size: parseFloat(b.size) }))
          .sort((a, b) => b.price - a.price);
        const asks = book.asks
          .map((a) => ({ price: parseFloat(a.price), size: parseFloat(a.size) }))
          .sort((a, b) => a.price - b.price);

        outcomeBooks.push({ sourceOutcomeId, canonicalOutcomeId, bids, asks });
      }

      await OrderBookSnapshot.create({
        venue: 'polymarket',
        sourceMarketId: vm.sourceMarketId,
        logicalMarketId: vm.logicalMarketId,
        timestamp,
        outcomes: outcomeBooks,
      });

      count++;
    } catch (err) {
      console.error(`[orderbook-sync] failed market ${vm.sourceMarketId}:`, (err as Error).message);
    }
  }

  console.log(`[orderbook-sync] inserted ${count} snapshots`);
}
