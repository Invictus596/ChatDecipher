import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * All WebGPU/WebLLM work stays in this worker. The dashboard talks to it
 * through the WebWorkerMLCEngine client, so token generation never blocks
 * React's main thread.
 */
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event);
};
