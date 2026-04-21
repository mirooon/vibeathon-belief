import { ApiProperty } from "@nestjs/swagger";
import type {
  MarketListItem,
  MarketListOutcome,
  MarketListResponse,
  MarketStatus,
  QuoteCurrency,
  Venue,
} from "@vibeahack/shared";
import { MarketStatusValues, VenueValues } from "./common.dto.js";

export class MarketListOutcomeDto implements MarketListOutcome {
  @ApiProperty({ example: "france" })
  outcomeId!: string;

  @ApiProperty({ example: "France" })
  outcomeLabel!: string;

  @ApiProperty({ example: 0.51, nullable: true })
  bestAsk!: number | null;

  @ApiProperty({ example: 0.49, nullable: true })
  bestBid!: number | null;
}

export class MarketListItemDto implements MarketListItem {
  @ApiProperty({ example: "fifa-2026-winner", description: "Canonical logical market id." })
  id!: string;

  @ApiProperty({ example: "2026 FIFA World Cup Winner" })
  title!: string;

  @ApiProperty({ example: "sports" })
  category!: string;

  @ApiProperty({ example: "2026-07-19T23:59:59.999Z", description: "ISO-8601 resolution deadline." })
  endDate!: string;

  @ApiProperty({ enum: MarketStatusValues, example: "open" })
  status!: MarketStatus;

  @ApiProperty({ enum: ["USD"], example: "USD" })
  quoteCurrency!: QuoteCurrency;

  @ApiProperty({ isArray: true, enum: VenueValues, example: ["polymarket", "kalshi", "myriad"] })
  venues!: Venue[];

  @ApiProperty({ type: [MarketListOutcomeDto] })
  outcomes!: MarketListOutcomeDto[];
}

export class MarketListResponseDto implements MarketListResponse {
  @ApiProperty({ type: [MarketListItemDto] })
  items!: MarketListItemDto[];

  @ApiProperty({
    example: null,
    nullable: true,
    description: "Opaque cursor for the next page. Phase 1 always returns null (all items fit in one page).",
  })
  cursor!: string | null;
}
