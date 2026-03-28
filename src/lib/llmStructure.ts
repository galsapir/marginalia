// ABOUTME: LLM-powered markdown structuring via BYOK API keys.
// ABOUTME: Sends raw PDF text to Claude or OpenAI to produce well-structured markdown.

import { getApiKey, getPreferredProvider, type LLMProvider } from './apiKey';

const SYSTEM_PROMPT = `You are a document formatting assistant. Convert the following raw text extracted from a PDF into clean, well-structured markdown. Preserve all content faithfully.

Rules:
- Infer headings from context (titles, section headers) and use appropriate heading levels (# ## ###)
- Preserve paragraph breaks
- Format lists as markdown lists (- or 1.)
- Format tables as markdown tables if you detect tabular data
- Wrap code snippets in fenced code blocks
- Do NOT add commentary, summaries, or content that wasn't in the original
- Do NOT wrap the output in a markdown code fence
- Output ONLY the formatted markdown`;

async function callAnthropic(text: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the raw text extracted from a PDF. Please convert it to well-structured markdown:\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(text: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is the raw text extracted from a PDF. Please convert it to well-structured markdown:\n\n${text}`,
        },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export interface StructureOptions {
  provider?: LLMProvider;
}

/**
 * Send raw text to an LLM to produce well-structured markdown.
 * Uses the user's stored BYOK API key.
 * Throws if no key is available or the API call fails.
 */
export async function structureWithLLM(
  rawText: string,
  options?: StructureOptions,
): Promise<string> {
  const provider = options?.provider ?? getPreferredProvider();
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new Error(
      `No ${provider} API key configured. Add one in settings to enable AI-powered formatting.`,
    );
  }

  // Truncate very long documents to avoid token limits
  const maxChars = 100_000;
  const truncated =
    rawText.length > maxChars
      ? rawText.slice(0, maxChars) + '\n\n[Document truncated due to length]'
      : rawText;

  if (provider === 'anthropic') {
    return callAnthropic(truncated, apiKey);
  } else {
    return callOpenAI(truncated, apiKey);
  }
}
