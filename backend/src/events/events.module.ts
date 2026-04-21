import { Module } from "@nestjs/common";
import { MongoModule } from "../mongo/mongo.module.js";
import { EventsController } from "./events.controller.js";
import { EventsService } from "./events.service.js";

@Module({
  imports: [MongoModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
