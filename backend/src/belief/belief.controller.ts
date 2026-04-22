import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  BeliefRouteRequestSchema,
  BeliefSearchRequestSchema,
} from "@vibeahack/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { BeliefService } from "./belief.service.js";

@ApiTags("belief")
@Controller("belief")
export class BeliefController {
  constructor(private readonly beliefService: BeliefService) {}

  @Post("search")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Search markets by natural-language belief",
    description:
      "Encode the belief as a concept vector and return the most semantically similar open markets, ranked by cosine similarity.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["belief"],
      properties: {
        belief: {
          type: "string",
          minLength: 3,
          maxLength: 500,
          example: "Donald Trump will stop the war on Iran",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          default: 5,
          example: 5,
        },
        minScore: {
          type: "number",
          minimum: 0,
          maximum: 1,
          default: 0,
          example: 0.3,
          description:
            "Cosine-similarity floor. Matches below this are dropped — `limit` becomes a cap, not a quota.",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Ranked list of matching markets with similarity scores (0–1).",
    schema: {
      type: "object",
      properties: {
        belief: { type: "string" },
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              score: { type: "number", minimum: 0, maximum: 1 },
              market: { type: "object" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 422, description: "Validation error — belief too short/long." })
  search(
    @Body(new ZodValidationPipe(BeliefSearchRequestSchema))
    req: { belief: string; limit?: number; minScore?: number },
  ) {
    return this.beliefService.search({
      belief: req.belief,
      limit: req.limit ?? 5,
      minScore: req.minScore ?? 0,
    });
  }

  @Post("route")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Budget-sized routed bets for a natural-language belief",
    description:
      "For a belief and USD budget, returns the top-N (market, outcome) matches. Each match includes the optimal cross-venue split sized in shares so that total USD cost (notional + fees) ≈ budget. `unfilledBudgetUsd > 0` when cross-venue depth is insufficient. Prices are 0–1 probabilities; fees are USD.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["belief", "budgetUsd"],
      properties: {
        belief: {
          type: "string",
          minLength: 3,
          maxLength: 500,
          example: "France will win the FIFA World Cup",
        },
        budgetUsd: {
          type: "number",
          minimum: 0,
          exclusiveMinimum: true,
          maximum: 1_000_000,
          example: 100,
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          default: 3,
          example: 3,
        },
        minScore: {
          type: "number",
          minimum: 0,
          maximum: 1,
          default: 0.3,
          example: 0.3,
          description:
            "Cosine-similarity floor. Matches below this are dropped — so `limit` becomes a cap, not a quota.",
        },
        side: {
          type: "string",
          enum: ["yes", "no"],
          description:
            "Force the outcome side for binary Yes/No markets. Omit to auto-detect polarity from negation keywords in the belief text.",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      "Ranked (market, outcome) matches each annotated with a budget-sized optimal route.",
    schema: {
      type: "object",
      properties: {
        belief: { type: "string" },
        budgetUsd: { type: "number" },
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              score: { type: "number", minimum: 0, maximum: 1 },
              market: { type: "object" },
              outcome: {
                type: "object",
                properties: {
                  outcomeId: { type: "string" },
                  outcomeLabel: { type: "string" },
                },
              },
              route: {
                type: "object",
                properties: {
                  splits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        venue: { type: "string" },
                        sizeShares: { type: "number" },
                        avgPrice: { type: "number" },
                        notionalUsd: { type: "number" },
                        fees: { type: "number" },
                      },
                    },
                  },
                  filledSizeShares: { type: "number" },
                  filledNotionalUsd: { type: "number" },
                  totalFeesUsd: { type: "number" },
                  totalCostUsd: { type: "number" },
                  unfilledBudgetUsd: { type: "number" },
                  blendedPrice: { type: "number" },
                  estimatedSlippageBps: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 422, description: "Validation error — belief or budget is invalid." })
  route(
    @Body(new ZodValidationPipe(BeliefRouteRequestSchema))
    req: {
      belief: string;
      budgetUsd: number;
      limit?: number;
      minScore?: number;
      side?: "yes" | "no";
    },
  ) {
    return this.beliefService.route({
      belief: req.belief,
      budgetUsd: req.budgetUsd,
      limit: req.limit ?? 3,
      minScore: req.minScore ?? 0.3,
      side: req.side,
    });
  }
}
