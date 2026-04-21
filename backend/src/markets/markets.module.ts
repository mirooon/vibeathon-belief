import { Module } from "@nestjs/common";
import { MatchingModule } from "../matching/matching.module.js";
import { MongoModule } from "../mongo/mongo.module.js";
import { MarketsController } from "./markets.controller.js";
import { MarketsService } from "./markets.service.js";

@Module({
  imports: [MongoModule, MatchingModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}
