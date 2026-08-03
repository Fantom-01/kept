import { localAdapter } from "./adapters/localAdapter.js";
import { supabaseAdapter } from "./adapters/supabaseAdapter.js";

const provider = import.meta.env.VITE_DATA_PROVIDER || "local";
const adapters = { local: localAdapter, supabase: supabaseAdapter };

if (!adapters[provider]) throw new Error(`Unknown Kept data provider: ${provider}.`);

export const habitApi = adapters[provider];
export const authApi = adapters[provider];
export const runtimeMode = provider;
