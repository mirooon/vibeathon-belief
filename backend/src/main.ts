import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { ErrorEnvelopeFilter } from "./common/error-envelope.filter.js";

const API_PREFIX = "api/v1";

async function bootstrap(): Promise<void> {
  const logger = new Logger("bootstrap");
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ErrorEnvelopeFilter());
  // Body validation is handled per-endpoint via ZodValidationPipe.
  app.enableCors({
    origin: true,
    methods: ["GET", "POST"],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Vibeahack API")
    .setDescription(
      "Prediction-markets aggregator across Polymarket, Kalshi, Myriad. " +
        "Phase 1 — mocked venue data. " +
        "Invariants: prices are 0–1 probabilities (not percentages); " +
        "`size` is in shares/contracts (not USD); `routes[0]` of a /quote response " +
        "is always the optimal route (isOptimal: true).",
    )
    .setVersion("1.0")
    .addTag("markets")
    .addTag("system")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  logger.log(`Vibeahack listening on :${port} (/${API_PREFIX})`);
  logger.log(`Swagger UI at /${API_PREFIX}/docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[bootstrap] FAILED", err);
  process.exit(1);
});
