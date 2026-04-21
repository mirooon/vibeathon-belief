import { fetchPriceHistory } from '../adapters/polymarket.client';
import { config } from '../config';
import { getPriceHistoryModel, getVenueMarketModel } from '../schemas';

interface VenueMarketLean {
  sourceMarketId: string;
  logicalMarketId: string;
  clobTokenIds?: string[];
  outcomes?: Array<{ sourceOutcomeId: string; label: string }>;
}

export async function runPriceSync(): Promise<void> {
  console.log('[price-sync] starting...');

  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'polymarket', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, clobTokenIds: 1, outcomes: 1 },
  )
    .limit(config.polyMaxMarkets)
    .lean()) as unknown as VenueMarketLean[];

  console.log(`[price-sync] processing ${markets.length} markets`);

  const PriceHistory = getPriceHistoryModel();
  let count = 0;

  for (const vm of markets) {
    const tokenIds = vm.clobTokenIds ?? [];

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i]!;
      const sourceOutcomeId = vm.outcomes?.[i]?.sourceOutcomeId ?? tokenId;
      const canonicalOutcomeId = `${vm.logicalMarketId}-${i}`;

      try {
        const { history } = await fetchPriceHistory(tokenId);
        if (!history?.length) continue;

        const points = history.map((h) => ({
          timestamp: new Date(h.t * 1000),
          price: h.p,
        }));

        await PriceHistory.findOneAndUpdate(
          { venue: 'polymarket', sourceMarketId: vm.sourceMarketId, sourceOutcomeId },
          {
            $set: {
              venue: 'polymarket',
              sourceMarketId: vm.sourceMarketId,
              logicalMarketId: vm.logicalMarketId,
              sourceOutcomeId,
              canonicalOutcomeId,
              points,
            },
          },
          { upsert: true },
        );

        count++;
      } catch (err) {
        console.error(
          `[price-sync] failed market=${vm.sourceMarketId} token=${tokenId}:`,
          (err as Error).message,
        );
      }
    }
  }

  console.log(`[price-sync] synced ${count} price histories`);
}
