export const config = {
  mongoUrl: process.env['MONGO_URL'] ?? 'mongodb://localhost:27017/vibeahack',
  marketSyncCron: process.env['MARKET_SYNC_CRON'] ?? '*/15 * * * *',
  orderbookSyncCron: process.env['ORDERBOOK_SYNC_CRON'] ?? '*/2 * * * *',
  priceSyncCron: process.env['PRICE_SYNC_CRON'] ?? '0 * * * *',
  // Event-sync scope: how many top-volume events to ingest per cycle.
  polyEventPageSize: 50,
  polyMaxEvents: parseInt(process.env['POLY_MAX_EVENTS'] ?? '100', 10),
  kalshiEventPageSize: 100,
  kalshiMaxEvents: parseInt(process.env['KALSHI_MAX_EVENTS'] ?? '150', 10),
  // Orderbook-sync scope: how many highest-volume venue markets to snapshot per cycle.
  // Child markets of large events (e.g. 60 World Cup teams) can easily exceed this.
  polyMaxMarkets: parseInt(process.env['POLY_MAX_MARKETS'] ?? '300', 10),
  kalshiMaxMarkets: parseInt(process.env['KALSHI_MAX_MARKETS'] ?? '200', 10),
} as const;
