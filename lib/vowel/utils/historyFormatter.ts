/**
 * @fileoverview History Formatter - Converts conversation transcripts to system prompt format
 * 
 * This utility formats conversation history for injection into system prompts,
 * enabling "informal" state restoration without server-side protocol changes.
 * 
 * @module @vowel.to/client/utils
 * @author vowel.to
 * @license Proprietary
 */

import type { VoiceSessionState } from "../managers/StateManager";

/**
 * Format conversation history for system prompt injection
 * 
 * Converts transcript array into a structured text block that can be
 * prepended to system instructions, giving the AI context about
 * previous conversation turns.
 * 
 * @param transcripts - Array of conversation transcripts
 * @param options - Formatting options
 * @param options.maxTurns - Maximum number of turns to include (default: all)
 * @param options.includeTimestamps - Include timestamps in output (default: false)
 * @returns Formatted history string for system prompt
 * 
 * @example
 * ```ts
 * const history = formatHistoryForPrompt(state.transcripts);
 * const instructions = `${history}\n\n${baseInstructions}`;
 * ```
 */
export function formatHistoryForPrompt(
  transcripts: VoiceSessionState['transcripts'],
  options?: {
    maxTurns?: number;
    includeTimestamps?: boolean;
  }
): string {
  if (!transcripts || transcripts.length === 0) {
    return '';
  }

  const maxTurns = options?.maxTurns;
  const includeTimestamps = options?.includeTimestamps ?? false;

  // Take only the last N turns (or all if maxTurns not specified)
  const recentTranscripts = maxTurns ? transcripts.slice(-maxTurns) : transcripts;

  // Build formatted history
  const lines: string[] = [
    '<PREVIOUS_CONVERSATION>',
    'The following is a summary of the conversation so far. Continue naturally from this context:',
    '',
  ];

  for (const transcript of recentTranscripts) {
    const role = transcript.role === 'user' ? 'User' : 'Assistant';
    const timestamp = includeTimestamps
      ? ` (${transcript.timestamp.toLocaleTimeString()})`
      : '';
    
    lines.push(`${role}${timestamp}: ${transcript.text}`);
  }

  lines.push('</PREVIOUS_CONVERSATION>');
  lines.push('');

  return lines.join('\n');
}

/**
 * Truncate conversation history to fit within token limits
 * 
 * Estimates token count and removes oldest turns until within limit.
 * Uses rough heuristic: 1 token ≈ 4 characters.
 * 
 * @param transcripts - Array of conversation transcripts
 * @param maxTokens - Maximum tokens to allow (default: 32000)
 * @returns Truncated transcript array
 * 
 * @example
 * ```ts
 * const truncated = truncateHistory(state.transcripts, 32000);
 * ```
 */
export function truncateHistory(
  transcripts: VoiceSessionState['transcripts'],
  maxTokens: number = 32000
): VoiceSessionState['transcripts'] {
  if (!transcripts || transcripts.length === 0) {
    return [];
  }

  // Estimate tokens (rough: 1 token ≈ 4 characters)
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  let totalTokens = 0;
  const result: typeof transcripts = [];

  // Work backwards from most recent
  for (let i = transcripts.length - 1; i >= 0; i--) {
    const transcript = transcripts[i];
    const tokens = estimateTokens(transcript.text);

    if (totalTokens + tokens > maxTokens) {
      break; // Would exceed limit
    }

    result.unshift(transcript); // Add to front
    totalTokens += tokens;
  }

  console.log(`📊 [HistoryFormatter] Truncated ${transcripts.length} turns to ${result.length} turns (${totalTokens} estimated tokens)`);

  return result;
}

