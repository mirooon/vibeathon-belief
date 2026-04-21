import { ApiProperty } from "@nestjs/swagger";
import type {
  EventListItem,
  EventListResponse,
  EventOutcomeRow,
  MarketStatus,
  Venue,
} from "@vibeahack/shared";

export class EventOutcomeRowDto implements EventOutcomeRow {
  @ApiProperty({ example: "polymarket-531942" })
  childMarketId!: string;

  @ApiProperty({ example: "Brazil" })
  label!: string;

  @ApiProperty({
    example: 0.18,
    nullable: true,
    description:
      "Cheapest YES ask across venues for the child market, 0-1 probability. Null when no depth.",
  })
  bestAsk!: number | null;

  @ApiProperty({
    example: 0.17,
    nullable: true,
    description: "Highest YES bid across venues for the child market. Null when no depth.",
  })
  bestBid!: number | null;
}

export class EventListItemDto implements EventListItem {
  @ApiProperty({ example: "polymarket-event-30615" })
  id!: string;

  @ApiProperty({ example: "2026 FIFA World Cup Winner" })
  title!: string;

  @ApiProperty({ required: false, example: "2026-fifa-world-cup-winner-595" })
  slug?: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty({ example: "2026" })
  category!: string;

  @ApiProperty({ example: "2026-07-20T00:00:00.000Z" })
  endDate!: string;

  @ApiProperty({ enum: ["open", "closed", "resolved"] })
  status!: MarketStatus;

  @ApiProperty({
    example: true,
    description:
      "True for grouped 'Who wins X?' events where exactly one child resolves YES.",
  })
  mutuallyExclusive!: boolean;

  @ApiProperty({ isArray: true, enum: ["polymarket", "kalshi", "myriad"] })
  venues!: Venue[];

  @ApiProperty({ example: 32 })
  childMarketCount!: number;

  @ApiProperty({ type: [EventOutcomeRowDto] })
  topOutcomes!: EventOutcomeRowDto[];

  @ApiProperty({ example: 14250815.65 })
  volume24h!: number;

  @ApiProperty({ example: 380000.5 })
  liquidity!: number;

  @ApiProperty({ example: false })
  featured!: boolean;
}

export class EventListResponseDto implements EventListResponse {
  @ApiProperty({ type: [EventListItemDto] })
  items!: EventListItemDto[];

  @ApiProperty({ nullable: true, example: null })
  cursor!: string | null;
}
