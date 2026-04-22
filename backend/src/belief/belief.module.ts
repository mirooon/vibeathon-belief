import { Module } from "@nestjs/common";
import { MongoModule } from "../mongo/mongo.module.js";
import { BeliefController } from "./belief.controller.js";
import { BeliefService } from "./belief.service.js";
import { EmbeddingService } from "./embedding.service.js";

@Module({
  imports: [MongoModule],
  controllers: [BeliefController],
  providers: [EmbeddingService, BeliefService],
})
export class BeliefModule {}
