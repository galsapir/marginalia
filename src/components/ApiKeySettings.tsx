// ABOUTME: BYOK API key settings panel for LLM-powered PDF structuring.
// ABOUTME: Stores keys in localStorage; shown as a collapsible section on InputView.

import { useState, useCallback } from 'react';
import {
  getStoredKeys,
  storeKeys,
  hasAnyApiKey,
  type LLMProvider,
} from '../lib/apiKey';

interface ApiKeySettingsProps {
  onKeysChanged?: () => void;
}

export function ApiKeySettings({ onKeysChanged }: ApiKeySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const stored = getStoredKeys();
  const [anthropicKey, setAnthropicKey] = useState(stored.anthropic ?? '');
  const [openaiKey, setOpenaiKey] = useState(stored.openai ?? '');
  const [preferred, setPreferred] = useState<LLMProvider>(
    stored.preferredProvider ?? 'anthropic',
  );
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    storeKeys({
      anthropic: anthropicKey.trim() || undefined,
      openai: openaiKey.trim() || undefined,
      preferredProvider: preferred,
    });
    setSaved(true);
    onKeysChanged?.();
    setTimeout(() => setSaved(false), 2000);
  }, [anthropicKey, openaiKey, preferred, onKeysChanged]);

  const hasKeys = hasAnyApiKey();

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 text-xs font-sans text-ink-300 dark:text-ink-400 hover:text-sienna-500 dark:hover:text-sienna-400 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        AI formatting
        {hasKeys && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-cream-100 dark:bg-ink-800 border border-cream-300 dark:border-ink-600 rounded-lg space-y-3">
          <p className="text-xs font-sans text-ink-400 dark:text-ink-300">
            Add an API key to enable AI-powered markdown structuring for PDFs.
            Keys are stored locally in your browser.
          </p>

          <div>
            <label className="block text-xs font-sans font-medium text-ink-500 dark:text-ink-200 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-1.5 text-xs font-mono bg-cream-50 dark:bg-ink-700 border border-cream-300 dark:border-ink-600 rounded text-ink-600 dark:text-ink-200 placeholder-ink-200 dark:placeholder-ink-500 focus:outline-none focus:border-sienna-400"
            />
          </div>

          <div>
            <label className="block text-xs font-sans font-medium text-ink-500 dark:text-ink-200 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-1.5 text-xs font-mono bg-cream-50 dark:bg-ink-700 border border-cream-300 dark:border-ink-600 rounded text-ink-600 dark:text-ink-200 placeholder-ink-200 dark:placeholder-ink-500 focus:outline-none focus:border-sienna-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-sans text-ink-400 dark:text-ink-300">
              Preferred:
            </label>
            <select
              value={preferred}
              onChange={(e) => setPreferred(e.target.value as LLMProvider)}
              className="text-xs font-sans bg-cream-50 dark:bg-ink-700 border border-cream-300 dark:border-ink-600 rounded px-2 py-1 text-ink-600 dark:text-ink-200 focus:outline-none focus:border-sienna-400"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs font-sans font-medium bg-ink-700 dark:bg-cream-100 text-cream-50 dark:text-ink-800 rounded hover:bg-ink-800 dark:hover:bg-cream-200 transition-colors"
            >
              Save
            </button>
            {saved && (
              <span className="text-xs font-sans text-green-600 dark:text-green-400">
                Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
