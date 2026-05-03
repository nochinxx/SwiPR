import { embed, embedMany } from "ai";
import { models } from "./ai";

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: models.embedding,
    value: text.slice(0, 8000),
  });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: models.embedding,
    values: texts.map((t) => t.slice(0, 8000)),
  });
  return embeddings;
}

export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((x) => x / vectors.length);
}
