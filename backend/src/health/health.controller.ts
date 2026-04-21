import { Controller, Get } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Connection } from "mongoose";
import { HealthResponseDto } from "./health.dto.js";

@ApiTags("system")
@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({
    summary: "Liveness + readiness probe",
    description:
      "Returns 200 once the process is running. `mongo` is 'up' when the Mongoose connection is in readyState=1, else 'down'. `uptimeSec` is wall-clock process uptime.",
  })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: "ok",
      mongo: this.connection.readyState === 1 ? "up" : "down",
      uptimeSec: Math.floor(process.uptime()),
    };
  }
}
