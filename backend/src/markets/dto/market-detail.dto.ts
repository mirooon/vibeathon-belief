import { ApiProperty } from "@nestjs/swagger";
import type {
  AggregatedBestPrice,
  MarketDetail,
  MarketStatus,
  OutcomePriceHistory,
  PriceHistoryPoint,
  QuoteCurrency,
  Venue,
  VenueBreakdown,
  VenueBreakdownOutcome,
} from "@vibeahack/shared";
import {
  AggregatedBestPriceDto,
  MarketStatusValues,
  OutcomeDto,
  VenueValues,
} from "./common.dto.js";

export class PriceHistoryPointDto implements PriceHistoryPoint {
  @ApiProperty({ example: "2026-04-14T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ example: 0.5, description: "0–1 probability." })
  price!: number;
}

export class VenueBreakdownOutcomeDto implements VenueBreakdownOutcome {
  @ApiProperty({ example: "france" })
  outcomeId!: string;

  @ApiProperty({ example: 0.49, nullable: true })
  bestBid!: number | null;

  @ApiProperty({ example: 0.51, nullable: true })
  bestAsk!: number | null;

  @ApiProperty({ example: 700, description: "Total bid-side size in shares across all levels." })
  bidDepth!: number;

  @ApiProperty({ example: 500, description: "Total ask-side size in shares across all levels." })
  askDepth!: number;
}

export class VenueBreakdownDto implements VenueBreakdown {
  @ApiProperty({ enum: VenueValues, example: "polymarket" })
  venue!: Venue;

  @ApiProperty({ example: "poly-fifa-2026-winner" })
  sourceMarketId!: string;

  @ApiProperty({
    example: "https://polymarket.com/event/example",
    nullable: true,
    required: false,
    description: "Public web URL to open this market on the venue.",
  })
  tradingUrl?: string | null;

  @ApiProperty({ type: [VenueBreakdownOutcomeDto] })
  outcomes!: VenueBreakdownOutcomeDto[];
}

export class OutcomePerVenueHistoryDto {
  @ApiProperty({ enum: VenueValues, example: "polymarket" })
  venue!: Venue;

  @ApiProperty({ type: [PriceHistoryPointDto] })
  points!: PriceHistoryPointDto[];
}

export class OutcomePriceHistoryDto implements OutcomePriceHistory {
  @ApiProperty({ example: "france" })
  outcomeId!: string;

  @ApiProperty({
    type: [PriceHistoryPointDto],
    description: "Unified best-price-across-venues series for the chart main line.",
  })
  unified!: PriceHistoryPointDto[];

  @ApiProperty({
    type: [OutcomePerVenueHistoryDto],
    description: "Per-venue overlay series (optional chart toggles).",
  })
  perVenue!: OutcomePerVenueHistoryDto[];
}

export class MarketDetailDto implements MarketDetail {
  @ApiProperty({ example: "fifa-2026-winner" })
  id!: string;

  @ApiProperty({ example: "2026 FIFA World Cup Winner" })
  title!: string;

  @ApiProperty({ example: "sports" })
  category!: string;

  @ApiProperty({ example: "2026-07-19T23:59:59.999Z" })
  endDate!: string;

  @ApiProperty({ enum: MarketStatusValues, example: "open" })
  status!: MarketStatus;

  @ApiProperty({ enum: ["USD"], example: "USD" })
  quoteCurrency!: QuoteCurrency;

  @ApiProperty({ type: [OutcomeDto] })
  outcomes!: OutcomeDto[];

  @ApiProperty({ type: [AggregatedBestPriceDto] })
  aggregatedBestPrices!: AggregatedBestPrice[];

  @ApiProperty({ type: [VenueBreakdownDto] })
  venueBreakdown!: VenueBreakdownDto[];

  @ApiProperty({ type: [OutcomePriceHistoryDto] })
  priceHistory!: OutcomePriceHistoryDto[];
}
