import { ApiProperty } from "@nestjs/swagger";
import type {
  AggregatedBestPrice,
  MarketStatus,
  Outcome,
  QuoteCurrency,
  Venue,
} from "@vibeahack/shared";

export class OutcomeDto implements Outcome {
  @ApiProperty({ example: "france", description: "Canonical outcome id within the logical market." })
  id!: string;

  @ApiProperty({ example: "France", description: "Human-readable outcome label." })
  label!: string;
}

export class AggregatedBestPriceDto implements AggregatedBestPrice {
  @ApiProperty({ example: "france" })
  outcomeId!: string;

  @ApiProperty({
    example: 0.49,
    nullable: true,
    description: "Highest bid across all venues for this outcome, 0–1 probability. Null if no depth.",
  })
  bestBid!: number | null;

  @ApiProperty({
    example: 0.51,
    nullable: true,
    description: "Lowest ask across all venues for this outcome, 0–1 probability. Null if no depth.",
  })
  bestAsk!: number | null;
}

export const MarketStatusValues: MarketStatus[] = ["open", "closed", "resolved"];

export const VenueValues: Venue[] = ["polymarket", "kalshi", "myriad"];

export type QuoteCurrencyValue = QuoteCurrency;
