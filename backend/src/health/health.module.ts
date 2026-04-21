import { Module } from "@nestjs/common";
import { MongoModule } from "../mongo/mongo.module.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [MongoModule],
  controllers: [HealthController],
})
export class HealthModule {}
