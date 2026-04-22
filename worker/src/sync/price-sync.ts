import {
  fetchMarket as fetchMyriadMarket,
  parseSourceMarketId,
} from '../adapters/myriad.client';
import { fetchPriceHistory } from '../adapters/polymarket.client';
import { config } from '../config';
import { getPriceHistoryModel, getVenueMarketModel } from '../schemas';

interface VenueMarketLean {
  sourceMarketId: string;
  logicalMarketId: string;
  clobTokenIds?: string[];
  outcomes?: Array<{ sourceOutcomeId: string; label: string }>;
}

async function syncPolymarketPrices(): Promise<number> {
  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'polymarket', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, clobTokenIds: 1, outcomes: 1 },
  )
    .limit(config.polyMaxMarkets)
    .lean()) as unknown as VenueMarketLean[];

  console.log(`[price-sync] polymarket: processing ${markets.length} markets`);

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
  return count;
}

async function syncMyriadPrices(): Promise<number> {
  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'myriad', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, outcomes: 1 },
  )
    .limit(config.myriadMaxMarkets)
    .lean()) as unknown as VenueMarketLean[];

  console.log(`[price-sync] myriad: processing ${markets.length} markets`);

  const PriceHistory = getPriceHistoryModel();
  let count = 0;

  for (const vm of markets) {
    const parsed = parseSourceMarketId(vm.sourceMarketId);
    if (!parsed) continue;

    try {
      const detail = await fetchMyriadMarket(parsed.id, parsed.networkId);
      for (let i = 0; i < detail.outcomes.length; i++) {
        const o = detail.outcomes[i]!;
        const chart = o.price_charts?.find((c) => c.timeframe === 'all');
        const prices = chart?.prices ?? [];
        if (!prices.length) continue;

        const sourceOutcomeId = String(o.id);
        const canonicalOutcomeId = `${vm.logicalMarketId}-${i}`;
        const points = prices.map((p) => ({
          timestamp: new Date(p.timestamp * 1000),
          price: p.value,
        }));

        await PriceHistory.findOneAndUpdate(
          { venue: 'myriad', sourceMarketId: vm.sourceMarketId, sourceOutcomeId },
          {
            $set: {
              venue: 'myriad',
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
      }
    } catch (err) {
      console.error(
        `[price-sync] myriad failed market=${vm.sourceMarketId}:`,
        (err as Error).message,
      );
    }
  }
  return count;
}

export async function runPriceSync(): Promise<void> {
  console.log('[price-sync] starting...');
  const venues = ['polymarket', 'myriad'] as const;
  const results = await Promise.allSettled([
    syncPolymarketPrices(),
    syncMyriadPrices(),
  ]);
  let total = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') total += r.value;
    else {
      console.error(
        `[price-sync] ${venues[i]} failed:`,
        (r.reason as Error)?.message ?? r.reason,
      );
    }
  });
  console.log(`[price-sync] synced ${total} price histories`);
}
