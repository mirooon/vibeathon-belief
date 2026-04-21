import { ApiProperty } from "@nestjs/swagger";
import type {
  EventDetail,
  EventDetailOutcome,
  MarketStatus,
  Venue,
} from "@vibeahack/shared";

export class EventDetailOutcomeDto implements EventDetailOutcome {
  @ApiProperty({ example: "polymarket-531942" })
  childMarketId!: string;

  @ApiProperty({ example: "Brazil" })
  label!: string;

  @ApiProperty({ nullable: true, example: 0.18 })
  bestAsk!: number | null;

  @ApiProperty({ nullable: true, example: 0.17 })
  bestBid!: number | null;

  @ApiProperty({ enum: ["polymarket", "kalshi", "myriad"] })
  venue!: Venue;

  @ApiProperty({ example: "531942" })
  sourceMarketId!: string;

  @ApiProperty({ example: "2026-07-20T00:00:00.000Z" })
  endDate!: string;
}

export class EventDetailDto implements EventDetail {
  @ApiProperty({ example: "polymarket-event-30615" })
  id!: string;

  @ApiProperty({ example: "2026 FIFA World Cup Winner" })
  title!: string;

  @ApiProperty({ required: false })
  slug?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty({ enum: ["open", "closed", "resolved"] })
  status!: MarketStatus;

  @ApiProperty()
  mutuallyExclusive!: boolean;

  @ApiProperty({ isArray: true, enum: ["polymarket", "kalshi", "myriad"] })
  venues!: Venue[];

  @ApiProperty({ type: [EventDetailOutcomeDto] })
  outcomes!: EventDetailOutcomeDto[];

  @ApiProperty()
  volume24h!: number;

  @ApiProperty()
  volume!: number;

  @ApiProperty()
  liquidity!: number;

  @ApiProperty()
  featured!: boolean;
}
