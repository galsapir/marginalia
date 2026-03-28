// ABOUTME: BYOK (Bring Your Own Key) API key management.
// ABOUTME: Stores API keys in localStorage for browser-direct LLM calls.

const STORAGE_KEY = 'marginalia_api_keys';

export type LLMProvider = 'anthropic' | 'openai';

interface StoredKeys {
  anthropic?: string;
  openai?: string;
  preferredProvider?: LLMProvider;
}

export function getStoredKeys(): StoredKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredKeys;
  } catch {
    return {};
  }
}

export function storeKeys(keys: StoredKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getApiKey(provider: LLMProvider): string | undefined {
  return getStoredKeys()[provider];
}

export function getPreferredProvider(): LLMProvider {
  const keys = getStoredKeys();
  if (keys.preferredProvider) return keys.preferredProvider;
  // Default: prefer anthropic if key exists, else openai
  if (keys.anthropic) return 'anthropic';
  if (keys.openai) return 'openai';
  return 'anthropic';
}

export function hasAnyApiKey(): boolean {
  const keys = getStoredKeys();
  return Boolean(keys.anthropic || keys.openai);
}

export function clearKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
}
