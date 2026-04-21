import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module.js";
import { MarketsModule } from "./markets/markets.module.js";
import { MatchingModule } from "./matching/matching.module.js";
import { MongoModule } from "./mongo/mongo.module.js";
import { VenuesModule } from "./venues/venues.module.js";

@Module({
  imports: [
    MongoModule,
    MatchingModule,
    VenuesModule,
    HealthModule,
    MarketsModule,
  ],
})
export class AppModule {}
