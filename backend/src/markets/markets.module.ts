import { Module } from "@nestjs/common";
import { MongoModule } from "../mongo/mongo.module.js";
import { MarketsController } from "./markets.controller.js";
import { MarketsService } from "./markets.service.js";

@Module({
  imports: [MongoModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}
