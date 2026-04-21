import { Module } from "@nestjs/common";
import { KalshiAdapter } from "./kalshi/kalshi.adapter.js";
import { MyriadAdapter } from "./myriad/myriad.adapter.js";
import { PolymarketAdapter } from "./polymarket/polymarket.adapter.js";
import { VENUE_ADAPTERS, type VenueAdapter } from "./venue-adapter.interface.js";

@Module({
  providers: [
    PolymarketAdapter,
    KalshiAdapter,
    MyriadAdapter,
    {
      provide: VENUE_ADAPTERS,
      useFactory: (
        poly: PolymarketAdapter,
        kalshi: KalshiAdapter,
        myriad: MyriadAdapter,
      ): VenueAdapter[] => [poly, kalshi, myriad],
      inject: [PolymarketAdapter, KalshiAdapter, MyriadAdapter],
    },
  ],
  exports: [VENUE_ADAPTERS, PolymarketAdapter, KalshiAdapter, MyriadAdapter],
})
export class VenuesModule {}
