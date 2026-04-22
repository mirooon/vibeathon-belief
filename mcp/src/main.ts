#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BackendError, callBackend } from './api-client';

const TOOLS: Tool[] = [
  {
    name: 'search_markets_by_belief',
    description:
      "Find prediction markets semantically relevant to a natural-language belief. Returns ranked (market, score) matches without sizing. Use this to discover which logical markets exist for a topic before quoting or routing. Scores are cosine similarity in [0, 1].",
    inputSchema: {
      type: 'object',
      required: ['belief'],
      additionalProperties: false,
      properties: {
        belief: {
          type: 'string',
          minLength: 3,
          maxLength: 500,
          description:
            "Natural-language belief, e.g. 'France will win the FIFA World Cup'.",
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 20,
          description: 'Max matches to return (default 5).',
        },
        minScore: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description:
            'Cosine-similarity floor — drops weaker matches (default 0).',
        },
      },
    },
  },
  {
    name: 'find_best_route_for_belief',
    description:
      "Given a natural-language belief and a USD budget, return the top-N (market, outcome) matches each annotated with the optimal cross-venue split sized so that total USD cost ≈ budget. This is the primary tool for answering 'what's the best way to bet on X with $Y?'. Prices are 0–1 probabilities. `route.unfilledBudgetUsd > 0` means cross-venue depth is insufficient to spend the full budget.",
    inputSchema: {
      type: 'object',
      required: ['belief', 'budgetUsd'],
      additionalProperties: false,
      properties: {
        belief: { type: 'string', minLength: 3, maxLength: 500 },
        budgetUsd: {
          type: 'number',
          exclusiveMinimum: 0,
          maximum: 1_000_000,
          description: 'USD budget to allocate across venues.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Max (market, outcome) matches to size (default 3).',
        },
        minScore: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Cosine-similarity floor (default 0.3).',
        },
      },
    },
  },
  {
    name: 'quote_market',
    description:
      'Multi-route quote for a specific (logicalMarketId, outcomeId, side, size). Returns `routes[0]` as the optimal cross-venue split plus one `single:<venue>` route per venue with any depth. Size is in SHARES, not USD. Use this after picking a market from search/route when you want venue-by-venue comparison at a specific share size.',
    inputSchema: {
      type: 'object',
      required: ['logicalMarketId', 'outcomeId', 'side', 'size'],
      additionalProperties: false,
      properties: {
        logicalMarketId: { type: 'string', minLength: 1 },
        outcomeId: { type: 'string', minLength: 1 },
        side: { type: 'string', enum: ['buy', 'sell'] },
        size: {
          type: 'number',
          exclusiveMinimum: 0,
          description: 'Shares/contracts to trade (not USD).',
        },
      },
    },
  },
];

function toolResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(err: unknown): CallToolResult {
  const payload =
    err instanceof BackendError
      ? {
          code: err.code,
          status: err.status,
          message: err.message,
          details: err.details,
        }
      : { message: err instanceof Error ? err.message : String(err) };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    isError: true,
  };
}

async function dispatch(
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  switch (name) {
    case 'search_markets_by_belief': {
      const body = await callBackend('POST', '/belief/search', args);
      return toolResult(body);
    }
    case 'find_best_route_for_belief': {
      const body = await callBackend('POST', '/belief/route', args);
      return toolResult(body);
    }
    case 'quote_market': {
      const { logicalMarketId, outcomeId, side, size } = args as {
        logicalMarketId: string;
        outcomeId: string;
        side: 'buy' | 'sell';
        size: number;
      };
      const body = await callBackend(
        'POST',
        `/markets/${encodeURIComponent(logicalMarketId)}/quote`,
        { outcomeId, side, size },
      );
      return toolResult(body);
    }
    default:
      return errorResult(new Error(`Unknown tool: ${name}`));
  }
}

const server = new Server(
  { name: 'vibeahack-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () =>
  Promise.resolve({ tools: TOOLS }),
);

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    return await dispatch(name, (args ?? {}) as Record<string, unknown>);
  } catch (err) {
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[vibeahack-mcp] listening on stdio');
}

main().catch((err) => {
  console.error('[vibeahack-mcp] fatal:', err);
  process.exit(1);
});
