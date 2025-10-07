/**
 * AI Planning Layer - OpenAI Client
 * 
 * Thin wrapper around the OpenAI SDK with:
 * - Environment-based initialization
 * - JSON-only output helpers
 * - Retry logic for parse failures
 * - Browser-safe guards
 */

import OpenAI from "openai";
import { OpenAICallOptions } from "./types";

// ============================================================================
// Client Initialization
// ============================================================================

let cachedClient: OpenAI | null = null;

/**
 * Get or create OpenAI client.
 * Returns null if REACT_APP_OPENAI_API_KEY is not set.
 * 
 * Note: In a production app, you'd typically make OpenAI calls from a backend
 * to avoid exposing API keys. This is a client-side implementation for simplicity.
 */
export function getOpenAI(): OpenAI | null {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key") {
    console.warn("OpenAI API key not configured. AI features will use fallback logic.");
    return null;
  }

  try {
    cachedClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage (not recommended for production)
    });
    return cachedClient;
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
    return null;
  }
}

/**
 * Check if OpenAI is available
 */
export function isOpenAIAvailable(): boolean {
  return getOpenAI() !== null;
}

// ============================================================================
// JSON Call Helper
// ============================================================================

/**
 * Call OpenAI with JSON-only output.
 * Validates and parses JSON response.
 * Retries on parse failure with corrective prompt.
 * 
 * @param model - Model to use (e.g., "gpt-4-turbo-preview", "gpt-4o-mini")
 * @param messages - Array of message objects with role and content
 * @param schema - JSON schema description (for prompt)
 * @param options - Call options (temperature, maxTokens, retries)
 * @returns Parsed JSON object
 * @throws Error if all retries fail or API call fails
 */
export async function callJSON<T = unknown>(
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  schema: string,
  options: OpenAICallOptions = {}
): Promise<T> {
  const client = getOpenAI();

  if (!client) {
    throw new Error("OpenAI client not available. Check REACT_APP_OPENAI_API_KEY.");
  }

  const {
    temperature = 0.7,
    maxTokens = 2000,
    retries = 2,
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      // Try with response_format first, fall back if not supported
      const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        max_tokens: maxTokens,
      };

      // Only add response_format for models that support it
      // gpt-4o, gpt-4o-mini, gpt-4-turbo and newer models support json_object
      if (model.includes("gpt-4o") || model.includes("gpt-4-turbo") || model.includes("gpt-3.5-turbo-1106")) {
        requestParams.response_format = { type: "json_object" };
      }

      const response = await client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      // Parse JSON
      const parsed = JSON.parse(content) as T;
      return parsed;

    } catch (error) {
      lastError = error as Error;
      
      // If it's a response_format error, retry without it
      if (
        (error as Error).message?.includes("response_format") &&
        attempt === 0
      ) {
        console.warn("Model doesn't support response_format, retrying without it...");
        attempt++;
        continue;
      }

      // If it's a parse error and we have retries left, try again with corrective message
      if (
        error instanceof SyntaxError &&
        attempt < retries
      ) {
        console.warn(`JSON parse failed (attempt ${attempt + 1}/${retries + 1}). Retrying...`);

        // Add corrective message
        messages.push({
          role: "assistant",
          content: (error as Error).message || "Invalid JSON",
        });
        messages.push({
          role: "user",
          content: `You returned invalid JSON. Please respond ONLY with valid JSON matching this schema:\n${schema}\n\nNo prose, no explanations, just JSON.`,
        });

        attempt++;
        continue;
      }

      // Other errors or out of retries
      break;
    }
  }

  // All retries exhausted
  throw new Error(
    `Failed to get valid JSON response after ${retries + 1} attempts: ${lastError?.message}`
  );
}

// ============================================================================
// Model Defaults
// ============================================================================

/**
 * Get default planner model from env or use fallback
 */
export function getDefaultPlannerModel(): string {
  return process.env.REACT_APP_OPENAI_MODEL || "gpt-4o-mini";
}

/**
 * Get default seasoning model from env or use fallback
 */
export function getDefaultSeasoningModel(): string {
  return process.env.REACT_APP_OPENAI_MODEL || "gpt-4o-mini";
}

// ============================================================================
// Simple Text Completion Helper (for seasoning)
// ============================================================================

/**
 * Simple text completion (non-JSON)
 * Used for optional AI seasoning where we want more flexible output.
 */
export async function callCompletion(
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: OpenAICallOptions = {}
): Promise<string> {
  const client = getOpenAI();

  if (!client) {
    throw new Error("OpenAI client not available. Check REACT_APP_OPENAI_API_KEY.");
  }

  const {
    temperature = 0.7,
    maxTokens = 1000,
  } = options;

  const response = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return content;
}

