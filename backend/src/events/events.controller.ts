import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  VenueSchema,
  type MarketStatus,
  type Venue,
} from "@vibeahack/shared";
import { VenueValues } from "../markets/dto/common.dto.js";
import { EventDetailDto } from "./dto/event-detail.dto.js";
import { EventListResponseDto } from "./dto/event-list.dto.js";
import { EventsService } from "./events.service.js";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  @ApiOperation({
    summary: "List logical events sorted by 24h volume",
    description:
      "Returns one row per grouped question (e.g. 'Who wins the 2026 World Cup?'). `topOutcomes` previews the leading child markets' YES best-ask/best-bid. Defaults to status=open, ordered by volume24h desc — the same ordering Polymarket's homepage uses.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["open", "closed", "resolved"],
    description: "Filter by status. Defaults to 'open'.",
  })
  @ApiQuery({
    name: "venue",
    required: false,
    enum: VenueValues,
    description: "Keep only events with markets on the given venue.",
  })
  @ApiQuery({
    name: "featured",
    required: false,
    type: Boolean,
    description: "Filter to featured events.",
  })
  @ApiOkResponse({ type: EventListResponseDto })
  async list(
    @Query("status") status?: MarketStatus,
    @Query("venue") venue?: string,
    @Query("featured") featured?: string,
  ): Promise<EventListResponseDto> {
    const filter: { status?: MarketStatus; venue?: Venue; featured?: boolean } = {};
    if (status) filter.status = status;
    if (venue) {
      const parsed = VenueSchema.safeParse(venue);
      if (parsed.success) filter.venue = parsed.data;
    }
    if (featured === "true") filter.featured = true;
    if (featured === "false") filter.featured = false;
    return (await this.service.list(filter)) as EventListResponseDto;
  }

  @Get(":id")
  @ApiOperation({
    summary: "Event detail: full leaderboard of child markets with current YES prices",
  })
  @ApiParam({ name: "id", example: "polymarket-event-30615" })
  @ApiOkResponse({ type: EventDetailDto })
  @ApiNotFoundResponse({
    description: "Event id is unknown (code MARKET_NOT_FOUND).",
  })
  async get(@Param("id") id: string): Promise<EventDetailDto> {
    return (await this.service.get(id)) as EventDetailDto;
  }
}
