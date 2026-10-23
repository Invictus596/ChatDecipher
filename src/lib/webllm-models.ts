/**
 * Lightweight prebuilt WebLLM models. Kept in a tiny module so the dashboard
 * never imports the WebLLM runtime until the user opts into a download.
 */
export const VIBE_CHECK_MODELS = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    name: "Llama 3.2 1B",
    badge: "Fastest",
    download: "≈ 0.7 GB",
    memory: "≈ 0.9 GB GPU",
    description: "Best fit for most laptops and recent phones.",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    name: "Qwen 2.5 1.5B",
    badge: "Richer",
    download: "≈ 1.0 GB",
    memory: "≈ 1.6 GB GPU",
    description: "Slightly stronger summaries; needs more GPU memory.",
  },
] as const;

export type VibeCheckModel = (typeof VIBE_CHECK_MODELS)[number];
export type VibeCheckModelId = VibeCheckModel["id"];

export function getVibeCheckModel(modelId: VibeCheckModelId): VibeCheckModel {
  return (
    VIBE_CHECK_MODELS.find((model) => model.id === modelId) ??
    VIBE_CHECK_MODELS[0]
  );
}
