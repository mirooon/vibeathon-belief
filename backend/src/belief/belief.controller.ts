import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { BeliefSearchRequestSchema } from "@vibeahack/shared";
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
    req: { belief: string; limit?: number },
  ) {
    return this.beliefService.search({ belief: req.belief, limit: req.limit ?? 5 });
  }
}
