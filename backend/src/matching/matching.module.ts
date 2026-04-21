import { Module } from "@nestjs/common";
import { MARKET_MATCHER } from "./market-matcher.interface.js";
import { StaticSeededMatcher } from "./static-seeded-matcher.js";

@Module({
  providers: [
    StaticSeededMatcher,
    { provide: MARKET_MATCHER, useExisting: StaticSeededMatcher },
  ],
  exports: [MARKET_MATCHER, StaticSeededMatcher],
})
export class MatchingModule {}
