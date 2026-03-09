/**
 * Extension Message Types
 * 
 * Type definitions for all messages passed between extension background script
 * and content scripts for the extension platform mode.
 * 
 * @packageDocumentation
 */

/**
 * Base message structure for extension ↔ content script communication
 */
export interface ExtensionMessage {
  /** Message type identifier */
  type: string;
  /** Unique message ID for request/response correlation */
  id: string;
  /** Timestamp when message was created */
  timestamp: number;
  /** Optional tab identifier */
  tabId?: number;
  /** Optional payload data */
  payload?: any;
}

// ============================================================================
// Content Script → Background Script Messages
// ============================================================================

/**
 * Request to start a voice session
 */
export interface StartSessionMessage extends ExtensionMessage {
  type: 'START_SESSION';
  payload?: {
    /** Optional configuration overrides */
    config?: any;
  };
}

/**
 * Request to stop the current voice session
 */
export interface StopSessionMessage extends ExtensionMessage {
  type: 'STOP_SESSION';
}

/**
 * Request current Vowel state
 */
export interface GetStateMessage extends ExtensionMessage {
  type: 'GET_STATE';
}

/**
 * Update Vowel configuration
 */
export interface UpdateConfigMessage extends ExtensionMessage {
  type: 'UPDATE_CONFIG';
  payload: {
    /** Partial configuration to update */
    config: any;
  };
}

/**
 * Send a text message to the agent (for testing/debugging)
 */
export interface SendUserMessageMessage extends ExtensionMessage {
  type: 'SEND_USER_MESSAGE';
  payload: {
    /** Text message to send */
    text: string;
  };
}

/**
 * Interrupt current agent action/speech
 */
export interface InterruptMessage extends ExtensionMessage {
  type: 'INTERRUPT';
}

/**
 * Union type of all content → background messages
 */
export type ContentToBackgroundMessage =
  | StartSessionMessage
  | StopSessionMessage
  | GetStateMessage
  | UpdateConfigMessage
  | SendUserMessageMessage
  | InterruptMessage;

// ============================================================================
// Background Script → Content Script Messages
// ============================================================================

/**
 * Vowel state update broadcast
 */
export interface StateUpdateMessage extends ExtensionMessage {
  type: 'STATE_UPDATE';
  payload: {
    /** Current session state */
    state: string;
    /** Whether actively listening to user */
    isListening: boolean;
    /** Whether agent is speaking */
    isSpeaking: boolean;
    /** Whether connected to API */
    isConnected: boolean;
    /** Whether this is the active tab */
    isActiveTab?: boolean;
  };
}

/**
 * Transcript update (user speech or agent response)
 */
export interface TranscriptUpdateMessage extends ExtensionMessage {
  type: 'TRANSCRIPT_UPDATE';
  payload: {
    /** Type of transcript */
    type: 'user' | 'agent';
    /** Transcript text */
    text: string;
    /** Whether this is the final transcript */
    isFinal: boolean;
  };
}

/**
 * Audio playback event notification
 */
export interface AudioPlaybackMessage extends ExtensionMessage {
  type: 'AUDIO_PLAYBACK';
  payload: {
    /** Playback event type */
    event: 'started' | 'stopped';
  };
}

/**
 * Error notification
 */
export interface ErrorMessage extends ExtensionMessage {
  type: 'ERROR';
  payload: {
    /** Error message */
    error: string;
    /** Optional error code */
    code?: string;
    /** Optional error details */
    details?: any;
  };
}

/**
 * Configuration update notification
 */
export interface ConfigUpdateMessage extends ExtensionMessage {
  type: 'CONFIG_UPDATE';
  payload: {
    /** Updated configuration */
    config: any;
  };
}

/**
 * Tool execution status notification
 */
export interface ToolExecutionMessage extends ExtensionMessage {
  type: 'TOOL_EXECUTION';
  payload: {
    /** Tool name */
    toolName: string;
    /** Execution status */
    status: 'started' | 'completed' | 'failed';
    /** Optional result data */
    result?: any;
    /** Optional error if failed */
    error?: string;
  };
}

/**
 * Union type of all background → content messages
 */
export type BackgroundToContentMessage =
  | StateUpdateMessage
  | TranscriptUpdateMessage
  | AudioPlaybackMessage
  | ErrorMessage
  | ConfigUpdateMessage
  | ToolExecutionMessage;

/**
 * Union type of all extension messages
 */
export type AnyExtensionMessage = ContentToBackgroundMessage | BackgroundToContentMessage;

/**
 * Message response structure
 */
export interface MessageResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Optional error message if failed */
  error?: string;
  /** Optional response data */
  data?: any;
  /** Optional state data for GET_STATE responses */
  state?: any;
}

