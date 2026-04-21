import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  ErrorCode,
  type EventDetail,
  type EventDetailOutcome,
  type EventListItem,
  type EventListResponse,
  type EventOutcomeRow,
  type MarketStatus,
  type OrderBookLevel,
  type Venue,
} from "@vibeahack/shared";
import type { Model } from "mongoose";
import { ApiException } from "../common/api-exception.js";
import {
  LOGICAL_EVENT_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
  VENUE_MARKET_MODEL,
} from "../mongo/schemas.js";

interface LogicalEventDoc {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  image?: string;
  icon?: string;
  category: string;
  endDate: Date;
  status: MarketStatus;
  mutuallyExclusive: boolean;
  childMarketIds: string[];
  venues: Venue[];
  volume24h: number;
  volume: number;
  liquidity: number;
  featured: boolean;
}

interface VenueMarketLean {
  venue: Venue;
  sourceMarketId: string;
  logicalMarketId: string;
  logicalEventId?: string;
  title: string;
  endDate: Date;
  groupItemTitle?: string;
  outcomes: Array<{ sourceOutcomeId: string; label: string }>;
  volume?: number;
}

interface SnapshotDoc {
  venue: Venue;
  sourceMarketId: string;
  logicalMarketId: string;
  timestamp: Date;
  outcomes: Array<{
    sourceOutcomeId: string;
    canonicalOutcomeId: string;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
  }>;
}

interface BestPrices {
  bestAsk: number | null;
  bestBid: number | null;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(LOGICAL_EVENT_MODEL)
    private readonly eventModel: Model<LogicalEventDoc>,
    @InjectModel(VENUE_MARKET_MODEL)
    private readonly venueMarketModel: Model<VenueMarketLean>,
    @InjectModel(ORDERBOOK_SNAPSHOT_MODEL)
    private readonly snapshotModel: Model<SnapshotDoc>,
  ) {}

  /**
   * List events sorted by 24h volume (the same ordering Polymarket's homepage uses).
   * `topOutcomes` is capped at TOP_OUTCOMES_PER_EVENT so the list payload stays compact;
   * the full set is available on the detail endpoint.
   */
  async list(
    filter: { status?: MarketStatus; venue?: Venue; featured?: boolean } = {},
  ): Promise<EventListResponse> {
    const TOP_OUTCOMES_PER_EVENT = 6;
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    else query.status = "open";
    if (filter.venue) query.venues = filter.venue;
    if (filter.featured !== undefined) query.featured = filter.featured;

    const events = (await this.eventModel
      .find(query)
      .sort({ volume24h: -1 })
      .lean<LogicalEventDoc[]>()
      .exec()) ?? [];

    if (events.length === 0) return { items: [], cursor: null };

    const { bestByChildMarket, childMeta } = await this.loadChildPrices(
      events.flatMap((e) => e.childMarketIds),
    );

    const items: EventListItem[] = events.map((e) => {
      const rows: EventOutcomeRow[] = e.childMarketIds
        .map((childId): EventOutcomeRow | null => {
          const meta = childMeta.get(childId);
          if (!meta) return null;
          const best = bestByChildMarket.get(childId) ?? {
            bestAsk: null,
            bestBid: null,
          };
          return {
            childMarketId: childId,
            label: outcomeRowLabel(meta, e.mutuallyExclusive),
            bestAsk: best.bestAsk,
            bestBid: best.bestBid,
          };
        })
        .filter((r): r is EventOutcomeRow => r !== null)
        .sort(byAskDesc);

      return {
        id: e._id,
        title: e.title,
        slug: e.slug,
        image: e.image,
        icon: e.icon,
        category: e.category,
        endDate: e.endDate.toISOString(),
        status: e.status,
        mutuallyExclusive: e.mutuallyExclusive,
        venues: e.venues,
        childMarketCount: e.childMarketIds.length,
        topOutcomes: rows.slice(0, TOP_OUTCOMES_PER_EVENT),
        volume24h: e.volume24h,
        liquidity: e.liquidity,
        featured: e.featured,
      };
    });

    return { items, cursor: null };
  }

  async get(id: string): Promise<EventDetail> {
    const event = await this.eventModel
      .findById(id)
      .lean<LogicalEventDoc | null>()
      .exec();
    if (!event) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.MARKET_NOT_FOUND,
        `No event with id '${id}'`,
        { eventId: id },
      );
    }

    const { bestByChildMarket, childMeta } = await this.loadChildPrices(
      event.childMarketIds,
    );

    const outcomes: EventDetailOutcome[] = event.childMarketIds
      .map((childId): EventDetailOutcome | null => {
        const meta = childMeta.get(childId);
        if (!meta) return null;
        const best = bestByChildMarket.get(childId) ?? {
          bestAsk: null,
          bestBid: null,
        };
        return {
          childMarketId: childId,
          label: outcomeRowLabel(meta, event.mutuallyExclusive),
          bestAsk: best.bestAsk,
          bestBid: best.bestBid,
          venue: meta.venue,
          sourceMarketId: meta.sourceMarketId,
          endDate: meta.endDate.toISOString(),
        };
      })
      .filter((r): r is EventDetailOutcome => r !== null)
      .sort(byAskDesc);

    return {
      id: event._id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      image: event.image,
      icon: event.icon,
      category: event.category,
      endDate: event.endDate.toISOString(),
      status: event.status,
      mutuallyExclusive: event.mutuallyExclusive,
      venues: event.venues,
      outcomes,
      volume24h: event.volume24h,
      volume: event.volume,
      liquidity: event.liquidity,
      featured: event.featured,
    };
  }

  /**
   * Load venue-market metadata + latest-snapshot YES-side prices for the given
   * logical market ids (the child markets of one or more events).
   *
   * YES semantics: for every child market the canonical "outcome 0" is the YES
   * side (Polymarket: first `outcomes[]` entry = "Yes"; Kalshi: the yes side).
   * The event row's bestAsk/bestBid is this YES side — which reads as "the
   * probability this child market resolves YES" on the event leaderboard.
   */
  private async loadChildPrices(
    childMarketIds: string[],
  ): Promise<{
    bestByChildMarket: Map<string, BestPrices>;
    childMeta: Map<string, VenueMarketLean>;
  }> {
    if (childMarketIds.length === 0) {
      return { bestByChildMarket: new Map(), childMeta: new Map() };
    }

    const venueMarkets = (await this.venueMarketModel
      .find(
        { logicalMarketId: { $in: childMarketIds } },
        {
          venue: 1,
          sourceMarketId: 1,
          logicalMarketId: 1,
          logicalEventId: 1,
          title: 1,
          endDate: 1,
          groupItemTitle: 1,
          outcomes: 1,
          volume: 1,
        },
      )
      .lean<VenueMarketLean[]>()
      .exec()) ?? [];

    // Keep first venue-market per logicalMarketId (Phase 1: one-venue-per-market).
    const childMeta = new Map<string, VenueMarketLean>();
    for (const vm of venueMarkets) {
      if (!childMeta.has(vm.logicalMarketId)) {
        childMeta.set(vm.logicalMarketId, vm);
      }
    }

    const snapshots = (await this.snapshotModel
      .find({ logicalMarketId: { $in: childMarketIds } })
      .sort({ timestamp: -1 })
      .lean<SnapshotDoc[]>()
      .exec()) ?? [];

    // Latest snapshot per (venue, sourceMarketId)
    const latestSnaps = new Map<string, SnapshotDoc>();
    for (const s of snapshots) {
      const key = `${s.venue}:${s.sourceMarketId}`;
      if (!latestSnaps.has(key)) latestSnaps.set(key, s);
    }

    const bestByChildMarket = new Map<string, BestPrices>();
    for (const snap of latestSnaps.values()) {
      // YES side = outcome index 0 in our canonical ordering.
      const yesOutcome = snap.outcomes.find((o) =>
        o.canonicalOutcomeId.endsWith("-0"),
      );
      if (!yesOutcome) continue;
      const bestAsk = yesOutcome.asks[0]?.price ?? null;
      const bestBid = yesOutcome.bids[0]?.price ?? null;
      const existing = bestByChildMarket.get(snap.logicalMarketId) ?? {
        bestAsk: null,
        bestBid: null,
      };
      existing.bestAsk =
        bestAsk === null
          ? existing.bestAsk
          : existing.bestAsk === null
            ? bestAsk
            : Math.min(existing.bestAsk, bestAsk);
      existing.bestBid =
        bestBid === null
          ? existing.bestBid
          : existing.bestBid === null
            ? bestBid
            : Math.max(existing.bestBid, bestBid);
      bestByChildMarket.set(snap.logicalMarketId, existing);
    }

    return { bestByChildMarket, childMeta };
  }
}

function outcomeRowLabel(meta: VenueMarketLean, mutuallyExclusive: boolean): string {
  if (mutuallyExclusive && meta.groupItemTitle) return meta.groupItemTitle;
  if (meta.groupItemTitle) return meta.groupItemTitle;
  return meta.title;
}

// Highest probability first. Null asks sort last so empty books don't dominate.
function byAskDesc(a: EventOutcomeRow, b: EventOutcomeRow): number {
  if (a.bestAsk === null && b.bestAsk === null) return 0;
  if (a.bestAsk === null) return 1;
  if (b.bestAsk === null) return -1;
  return b.bestAsk - a.bestAsk;
}
