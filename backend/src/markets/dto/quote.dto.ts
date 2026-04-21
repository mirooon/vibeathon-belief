import { ApiProperty } from "@nestjs/swagger";
import type {
  OrderSide,
  QuoteRequest,
  QuoteResponse,
  QuoteRoute,
  QuoteSplit,
  Venue,
} from "@vibeahack/shared";
import { VenueValues } from "./common.dto.js";

export const OrderSideValues: OrderSide[] = ["buy", "sell"];

export class QuoteRequestDto implements QuoteRequest {
  @ApiProperty({ example: "france", description: "Canonical outcome id (from the logical market's outcomes[])." })
  outcomeId!: string;

  @ApiProperty({ enum: OrderSideValues, example: "buy", description: "'buy' walks asks; 'sell' walks bids." })
  side!: OrderSide;

  @ApiProperty({ example: 600, minimum: 0, description: "Size in SHARES/CONTRACTS (not USD). USD cost = size × avgPrice." })
  size!: number;
}

export class QuoteSplitDto implements QuoteSplit {
  @ApiProperty({ enum: VenueValues, example: "polymarket" })
  venue!: Venue;

  @ApiProperty({ example: 500, description: "Shares allocated to this venue." })
  size!: number;

  @ApiProperty({ example: 0.51, description: "Size-weighted average fill price across this venue's consumed levels (0–1)." })
  avgPrice!: number;

  @ApiProperty({ example: 0, description: "USD fees for this split. Computed from per-venue static takerBps." })
  fees!: number;
}

export class QuoteRouteDto implements QuoteRoute {
  @ApiProperty({ example: "optimal", description: "'optimal' (greedy split) or 'single:<venue>' (single-venue only)." })
  id!: string;

  @ApiProperty({ example: "Best blended price (split across venues)" })
  label!: string;

  @ApiProperty({ example: true, description: "Exactly one route per response has isOptimal: true (routes[0])." })
  isOptimal!: boolean;

  @ApiProperty({ type: [QuoteSplitDto], description: "Per-venue allocation in execution order (first-filled first)." })
  splits!: QuoteSplitDto[];

  @ApiProperty({ example: 600, description: "Sum of splits[].size. Always ≤ request.size." })
  filledSize!: number;

  @ApiProperty({ example: 0, description: "request.size − filledSize, ≥ 0." })
  unfilledSize!: number;

  @ApiProperty({ example: 0.5142, description: "Size-weighted blended fill price. 4-decimal rounding. 0 when filledSize=0." })
  blendedPrice!: number;

  @ApiProperty({ example: 1.07, description: "Sum of splits[].fees in USD." })
  totalFees!: number;

  @ApiProperty({ example: 42, description: "Execution slippage vs top-of-book, in basis points (rounded, ≥ 0)." })
  estimatedSlippageBps!: number;
}

export class QuoteResponseRequestEchoDto {
  @ApiProperty({ example: "fifa-2026-winner" })
  logicalMarketId!: string;

  @ApiProperty({ example: "france" })
  outcomeId!: string;

  @ApiProperty({ enum: OrderSideValues, example: "buy" })
  side!: OrderSide;

  @ApiProperty({ example: 600 })
  size!: number;
}

export class QuoteResponseDto implements QuoteResponse {
  @ApiProperty({ type: QuoteResponseRequestEchoDto, description: "Echo of the original request parameters." })
  request!: QuoteResponseRequestEchoDto;

  @ApiProperty({
    type: [QuoteRouteDto],
    description:
      "routes[0] is always the optimal route (isOptimal: true). Subsequent routes are `single:<venue>` options for every venue that has any depth, in venue-enum order (polymarket, kalshi, myriad).",
  })
  routes!: QuoteRouteDto[];
}
