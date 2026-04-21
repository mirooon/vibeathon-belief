export const config = {
  mongoUrl: process.env['MONGO_URL'] ?? 'mongodb://localhost:27017/vibeahack',
  marketSyncCron: process.env['MARKET_SYNC_CRON'] ?? '*/15 * * * *',
  orderbookSyncCron: process.env['ORDERBOOK_SYNC_CRON'] ?? '*/2 * * * *',
  priceSyncCron: process.env['PRICE_SYNC_CRON'] ?? '0 * * * *',
  polyPageSize: 100,
  polyMaxMarkets: parseInt(process.env['POLY_MAX_MARKETS'] ?? '100', 10),
} as const;
