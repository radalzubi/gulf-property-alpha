import type { Adapter } from "../core/adapter";
import { dubaiPulseAdapter } from "./dubaiPulse";
import { STUB_ADAPTERS, SAMPLE_FEED_ADAPTERS, MANUAL_UPLOAD_ADAPTER } from "./stubs";

/** The full connector registry. */
export const ADAPTERS: Adapter[] = [
  dubaiPulseAdapter,
  ...STUB_ADAPTERS,
  ...SAMPLE_FEED_ADAPTERS,
  MANUAL_UPLOAD_ADAPTER,
];

export const ADAPTER_BY_ID = new Map(ADAPTERS.map((a) => [a.id, a]));

export { dubaiPulseAdapter };
