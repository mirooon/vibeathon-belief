import { ApiProperty } from "@nestjs/swagger";
import type { HealthResponse } from "@vibeahack/shared";

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ["ok"], example: "ok", description: "Always 'ok' when the process is live." })
  status!: "ok";

  @ApiProperty({ enum: ["up", "down"], example: "up", description: "Mongoose connection readyState=1 => 'up'." })
  mongo!: "up" | "down";

  @ApiProperty({ example: 42, description: "Seconds since the process started (Math.floor(process.uptime()))." })
  uptimeSec!: number;
}
