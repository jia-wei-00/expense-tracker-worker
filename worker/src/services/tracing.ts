import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import type { Callbacks } from "@langchain/core/callbacks/manager";
import { Client } from "langsmith";
import type { Env } from "@/env";

export interface Tracing {
  /** Pass to every LangChain `invoke()` so runs are logged to LangSmith. */
  callbacks: Callbacks;
  /** Flush queued trace batches before the Worker isolate is frozen. */
  flush: () => Promise<void>;
}

/**
 * Builds a LangSmith tracer from env config, or returns `undefined` when
 * tracing is disabled.
 *
 * Configured programmatically (not via `process.env`) because Cloudflare
 * Workers expose bindings through the `env` argument, not Node's environment.
 */
export function createTracing(env: Env): Tracing | undefined {
  if (env.LANGSMITH_TRACING !== "true" || !env.LANGSMITH_API_KEY) {
    return undefined;
  }

  const client = new Client({
    apiKey: env.LANGSMITH_API_KEY,
    apiUrl: env.LANGSMITH_ENDPOINT || undefined,
  });
  const tracer = new LangChainTracer({
    client,
    projectName: env.LANGSMITH_PROJECT || undefined,
  });

  return {
    callbacks: [tracer],
    flush: () => client.flush(),
  };
}
