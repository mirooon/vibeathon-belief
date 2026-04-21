import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { FeatureExtractionPipeline } from "@xenova/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipeline: FeatureExtractionPipeline | null = null;
  private readyPromise: Promise<void> | null = null;

  onModuleInit(): void {
    // Start loading in background — server stays responsive while model downloads.
    this.readyPromise = this.loadModel();
  }

  private async loadModel(): Promise<void> {
    this.logger.log(`Loading embedding model ${MODEL}…`);
    // Dynamic import keeps the ESM package working regardless of output module format.
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = false;
    this.pipeline = await pipeline("feature-extraction", MODEL);
    this.logger.log("Embedding model ready.");
  }

  private async ready(): Promise<FeatureExtractionPipeline> {
    if (this.pipeline) return this.pipeline;
    await (this.readyPromise ??= this.loadModel());
    return this.pipeline!;
  }

  async encode(text: string): Promise<number[]> {
    const pipe = await this.ready();
    const output = await pipe(text, { pooling: "mean", normalize: true });
    // output.data is Float32Array of length 384 (model dimension)
    return Array.from(output.data as Float32Array);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    // Vectors are L2-normalized by the model → dot product equals cosine similarity.
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
    return Math.min(1, Math.max(0, dot));
  }
}
