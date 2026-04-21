import cron from 'node-cron';
import { config } from './config';
import { connectDb, disconnectDb } from './db';
import { runMarketSync } from './sync/market-sync';
import { runOrderbookSync } from './sync/orderbook-sync';
import { runPriceSync } from './sync/price-sync';

async function safeRun(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    console.log(`[${name}] done in ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`[${name}] failed:`, err);
  }
}

async function main(): Promise<void> {
  await connectDb();

  // Run all syncs immediately on startup
  await safeRun('market-sync', runMarketSync);
  await safeRun('orderbook-sync', runOrderbookSync);
  await safeRun('price-sync', runPriceSync);

  // Markets: every 15 min
  cron.schedule(config.marketSyncCron, () => {
    void safeRun('market-sync', runMarketSync);
  });

  // Orderbooks: every 2 min
  cron.schedule(config.orderbookSyncCron, () => {
    void safeRun('orderbook-sync', runOrderbookSync);
  });

  // Price history: every hour
  cron.schedule(config.priceSyncCron, () => {
    void safeRun('price-sync', runPriceSync);
  });

  console.log(
    `[worker] scheduled — markets: ${config.marketSyncCron} | orderbooks: ${config.orderbookSyncCron} | prices: ${config.priceSyncCron}`,
  );

  process.on('SIGTERM', () => {
    void disconnectDb().then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    void disconnectDb().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('[worker] fatal:', err);
  process.exit(1);
});
