import {
  fetchOrderBook as fetchKalshiOrderBook,
  type KalshiOrderBook,
} from '../adapters/kalshi.client';
import {
  fetchQuote as fetchMyriadQuote,
  parseSourceMarketId,
} from '../adapters/myriad.client';
import { fetchOrderBook } from '../adapters/polymarket.client';
import { config } from '../config';
import { getOrderBookSnapshotModel, getVenueMarketModel } from '../schemas';

interface VenueMarketLean {
  sourceMarketId: string;
  logicalMarketId: string;
  clobTokenIds?: string[];
  outcomes?: Array<{ sourceOutcomeId: string; label: string }>;
}

interface Level {
  price: number;
  size: number;
}

async function syncPolymarketOrderbooks(): Promise<void> {
  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'polymarket', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, clobTokenIds: 1, outcomes: 1, volume: 1 },
  )
    .sort({ volume: -1 })
    .limit(config.polyMaxMarkets)
    .lean()) as unknown as VenueMarketLean[];

  console.log(`[orderbook-sync] polymarket: processing ${markets.length} markets`);

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
      console.error(
        `[orderbook-sync] polymarket failed market ${vm.sourceMarketId}:`,
        (err as Error).message,
      );
    }
  }

  console.log(`[orderbook-sync] polymarket inserted ${count} snapshots`);
}

// Kalshi returns one-sided bids per outcome (yes bids, no bids) in cents.
// The complementary side (asks on YES) is reconstructed from the other side's
// bids: an ask on YES at price p is equivalent to a bid on NO at price (100-p).
function buildKalshiTwoSided(
  sideBids: Array<[number, number]> | null,
  oppositeBids: Array<[number, number]> | null,
): { bids: Level[]; asks: Level[] } {
  const bids: Level[] = (sideBids ?? [])
    .map(([cents, size]) => ({ price: cents / 100, size }))
    .sort((a, b) => b.price - a.price);
  const asks: Level[] = (oppositeBids ?? [])
    .map(([cents, size]) => ({ price: (100 - cents) / 100, size }))
    .sort((a, b) => a.price - b.price);
  return { bids, asks };
}

async function syncKalshiOrderbooks(): Promise<void> {
  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'kalshi', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, outcomes: 1, volume: 1 },
  )
    .sort({ volume: -1 })
    .limit(config.kalshiMaxMarkets)
    .lean()) as unknown as VenueMarketLean[];

  console.log(`[orderbook-sync] kalshi: processing ${markets.length} markets`);

  const OrderBookSnapshot = getOrderBookSnapshotModel();
  const timestamp = new Date();
  let count = 0;

  for (const vm of markets) {
    try {
      const book: KalshiOrderBook = await fetchKalshiOrderBook(vm.sourceMarketId);
      const yesSourceId = vm.outcomes?.[0]?.sourceOutcomeId ?? `${vm.sourceMarketId}-yes`;
      const noSourceId = vm.outcomes?.[1]?.sourceOutcomeId ?? `${vm.sourceMarketId}-no`;

      const yesBook = buildKalshiTwoSided(book.yes, book.no);
      const noBook = buildKalshiTwoSided(book.no, book.yes);

      const outcomeBooks = [
        {
          sourceOutcomeId: yesSourceId,
          canonicalOutcomeId: `${vm.logicalMarketId}-0`,
          bids: yesBook.bids,
          asks: yesBook.asks,
        },
        {
          sourceOutcomeId: noSourceId,
          canonicalOutcomeId: `${vm.logicalMarketId}-1`,
          bids: noBook.bids,
          asks: noBook.asks,
        },
      ];

      await OrderBookSnapshot.create({
        venue: 'kalshi',
        sourceMarketId: vm.sourceMarketId,
        logicalMarketId: vm.logicalMarketId,
        timestamp,
        outcomes: outcomeBooks,
      });

      count++;
    } catch (err) {
      console.error(
        `[orderbook-sync] kalshi failed market ${vm.sourceMarketId}:`,
        (err as Error).message,
      );
    }
  }

  console.log(`[orderbook-sync] kalshi inserted ${count} snapshots`);
}

/**
 * Convert a series of AMM quotes at ascending notionals into order-book levels.
 * Each quote reports cumulative shares for a cumulative notional; the tranche
 * between consecutive quotes is a single level whose price is its marginal
 * average (Δvalue / Δshares) and whose size is Δshares.
 *
 * Quotes that didn't return usable numbers are skipped; monotonically
 * non-increasing share steps (AMM depth exhausted) end the series early.
 */
function synthLevelsFromQuotes(
  quotes: Array<{ value: number; shares: number } | null>,
): Level[] {
  const levels: Level[] = [];
  let prevValue = 0;
  let prevShares = 0;
  for (const q of quotes) {
    if (!q || !Number.isFinite(q.value) || !Number.isFinite(q.shares)) continue;
    const dv = q.value - prevValue;
    const ds = q.shares - prevShares;
    if (dv <= 0 || ds <= 0) break;
    levels.push({ price: dv / ds, size: ds });
    prevValue = q.value;
    prevShares = q.shares;
  }
  return levels;
}

async function sampleMyriadSide(
  marketId: number,
  networkId: number,
  outcomeId: number,
  action: 'buy' | 'sell',
  notionals: readonly number[],
): Promise<Array<{ value: number; shares: number } | null>> {
  const out: Array<{ value: number; shares: number } | null> = [];
  for (const value of notionals) {
    try {
      const q = await fetchMyriadQuote({
        marketId,
        networkId,
        outcomeId,
        action,
        value,
      });
      out.push({ value, shares: q.shares });
    } catch {
      out.push(null);
    }
  }
  return out;
}

async function syncMyriadOrderbooks(): Promise<void> {
  const VenueMarket = getVenueMarketModel();
  const markets = (await VenueMarket.find(
    { venue: 'myriad', status: 'open' },
    { sourceMarketId: 1, logicalMarketId: 1, outcomes: 1, volume: 1 },
  )
    .sort({ volume: -1 })
    .limit(config.myriadOrderbookMaxMarkets)
    .lean()) as unknown as VenueMarketLean[];

  console.log(`[orderbook-sync] myriad: processing ${markets.length} markets`);

  const OrderBookSnapshot = getOrderBookSnapshotModel();
  const timestamp = new Date();
  let count = 0;

  for (const vm of markets) {
    const parsed = parseSourceMarketId(vm.sourceMarketId);
    if (!parsed) continue;

    try {
      const outcomeBooks = [];
      for (let i = 0; i < (vm.outcomes?.length ?? 0); i++) {
        const nativeOutcome = vm.outcomes![i]!;
        const outcomeIdNum = Number(nativeOutcome.sourceOutcomeId);
        if (!Number.isFinite(outcomeIdNum)) continue;

        const [buyQuotes, sellQuotes] = await Promise.all([
          sampleMyriadSide(
            parsed.id,
            parsed.networkId,
            outcomeIdNum,
            'buy',
            config.myriadQuoteNotionals,
          ),
          sampleMyriadSide(
            parsed.id,
            parsed.networkId,
            outcomeIdNum,
            'sell',
            config.myriadQuoteNotionals,
          ),
        ]);

        const asks = synthLevelsFromQuotes(buyQuotes).sort(
          (a, b) => a.price - b.price,
        );
        const bids = synthLevelsFromQuotes(sellQuotes).sort(
          (a, b) => b.price - a.price,
        );

        outcomeBooks.push({
          sourceOutcomeId: nativeOutcome.sourceOutcomeId,
          canonicalOutcomeId: `${vm.logicalMarketId}-${i}`,
          bids,
          asks,
        });
      }

      if (!outcomeBooks.length) continue;
      await OrderBookSnapshot.create({
        venue: 'myriad',
        sourceMarketId: vm.sourceMarketId,
        logicalMarketId: vm.logicalMarketId,
        timestamp,
        outcomes: outcomeBooks,
      });
      count++;
    } catch (err) {
      console.error(
        `[orderbook-sync] myriad failed market ${vm.sourceMarketId}:`,
        (err as Error).message,
      );
    }
  }

  console.log(`[orderbook-sync] myriad inserted ${count} snapshots`);
}

export async function runOrderbookSync(): Promise<void> {
  console.log('[orderbook-sync] starting...');
  const venues = ['polymarket', 'kalshi', 'myriad'] as const;
  const results = await Promise.allSettled([
    syncPolymarketOrderbooks(),
    syncKalshiOrderbooks(),
    syncMyriadOrderbooks(),
  ]);
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(
        `[orderbook-sync] ${venues[i]} failed:`,
        (r.reason as Error)?.message ?? r.reason,
      );
    }
  });
}
