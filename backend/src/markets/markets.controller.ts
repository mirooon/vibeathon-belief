import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  QuoteRequestSchema,
  VenueSchema,
  type MarketSortField,
  type MarketSortOrder,
  type MarketStatus,
  type QuoteRequest,
  type Venue,
} from "@vibeahack/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { MarketDetailDto } from "./dto/market-detail.dto.js";
import { MarketListResponseDto } from "./dto/market-list.dto.js";
import { QuoteRequestDto, QuoteResponseDto } from "./dto/quote.dto.js";
import { MarketsService } from "./markets.service.js";
import { VenueValues } from "./dto/common.dto.js";

@ApiTags("markets")
@Controller("markets")
export class MarketsController {
  constructor(private readonly service: MarketsService) {}

  @Get()
  @ApiOperation({
    summary: "List logical markets with aggregated best prices",
    description:
      "Returns one row per logical market with best bid/ask per outcome aggregated across all venues with current depth. Phase 1 returns all matching items in a single page (cursor is always null).",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["open", "closed", "resolved"],
    description: "Filter by market status.",
  })
  @ApiQuery({
    name: "venue",
    required: false,
    isArray: true,
    enum: VenueValues,
    description:
      "Filter by supported venue. Repeatable: `?venue=polymarket&venue=kalshi` keeps markets listed on either. Omit to include all venues.",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["endDate", "volume24h", "tvl"],
    description: "Sort field. Defaults to `endDate`.",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    enum: ["asc", "desc"],
    description:
      "Sort direction. Defaults to `asc` for `endDate` and `desc` for `volume24h` / `tvl`.",
  })
  @ApiOkResponse({ type: MarketListResponseDto })
  async list(
    @Query("status") status?: MarketStatus,
    @Query("venue") venue?: string | string[],
    @Query("sortBy") sortBy?: MarketSortField,
    @Query("sortOrder") sortOrder?: MarketSortOrder,
  ): Promise<MarketListResponseDto> {
    const filter: {
      status?: MarketStatus;
      venues?: Venue[];
      sortBy?: MarketSortField;
      sortOrder?: MarketSortOrder;
    } = {};
    if (status) filter.status = status;
    const rawVenues = venue === undefined ? [] : Array.isArray(venue) ? venue : [venue];
    const parsedVenues = rawVenues
      .map((v) => VenueSchema.safeParse(v))
      .flatMap((r) => (r.success ? [r.data] : []));
    if (parsedVenues.length > 0) filter.venues = parsedVenues;
    if (sortBy) filter.sortBy = sortBy;
    if (sortOrder) filter.sortOrder = sortOrder;
    return this.service.list(filter);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Logical market detail: aggregated prices + per-venue breakdown + unified price history",
    description:
      "Returns the canonical market shape with (a) aggregated best bid/ask per outcome, (b) per-venue breakdown (best bid/ask and total depth per side), and (c) per-outcome price history (unified best-price series + per-venue overlays). `from`/`to` query params filter the price history window to [from, to] inclusive; both are ISO-8601.",
  })
  @ApiParam({ name: "id", example: "fifa-2026-winner" })
  @ApiQuery({ name: "from", required: false, example: "2026-03-17T00:00:00.000Z" })
  @ApiQuery({ name: "to", required: false, example: "2026-04-21T23:59:59.999Z" })
  @ApiOkResponse({ type: MarketDetailDto })
  @ApiNotFoundResponse({ description: "Logical market id is unknown (code MARKET_NOT_FOUND)." })
  async get(
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<MarketDetailDto> {
    const range: { from?: string; to?: string } = {};
    if (from) range.from = from;
    if (to) range.to = to;
    return (await this.service.get(id, range)) as MarketDetailDto;
  }

  @Post(":id/quote")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Multi-route quote: optimal split + one route per venue",
    description:
      "Returns `routes[0]` as the optimal greedy-split route across all venues with depth, followed by one `single:<venue>` route per venue with any depth for this outcome — even if that venue cannot fully fill (unfilledSize > 0 is surfaced, not hidden). Clients can rely on the first route being optimal (routes[0].isOptimal === true). Size is in SHARES, not USD; prices are 0–1 probabilities. blendedPrice is rounded to 4 decimals; fees and totalFees to 2.",
  })
  @ApiParam({ name: "id", example: "fifa-2026-winner" })
  @ApiBody({ type: QuoteRequestDto })
  @ApiOkResponse({ type: QuoteResponseDto })
  @ApiNotFoundResponse({
    description:
      "Logical market or outcome is unknown (code MARKET_NOT_FOUND or OUTCOME_NOT_FOUND).",
  })
  @ApiConflictResponse({
    description: "Market status is not 'open' (code MARKET_NOT_OPEN).",
  })
  async quote(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(QuoteRequestSchema)) body: QuoteRequest,
  ): Promise<QuoteResponseDto> {
    return (await this.service.quote(id, body)) as QuoteResponseDto;
  }
}
