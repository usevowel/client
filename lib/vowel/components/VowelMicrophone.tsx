/**
 * VowelMicrophone Component
 * Microphone button for voice interaction
 */

import { Mic, MicOff, Loader2, Wrench } from "lucide-react";
import { useVowel } from "./VowelProviderSimple";
import { cn } from "../utils";
import { useEffect } from "react";
import "../styles/styles.css";

/**
 * Props for VowelMicrophone
 */
export interface VowelMicrophoneProps {
  /** Size of the button */
  size?: "small" | "default" | "large";

  /** Custom className */
  className?: string;

  /** Custom color (Tailwind classes) */
  color?: string;

  /** Show status text */
  showStatus?: boolean;
}

/**
 * Microphone button component
 * Can be placed anywhere in your app
 *
 * @example
 * ```tsx
 * import { VowelMicrophone } from '@/lib/vowel';
 *
 * function Header() {
 *   return (
 *     <header>
 *       <VowelMicrophone size="default" showStatus />
 *     </header>
 *   );
 * }
 * ```
 */
export function VowelMicrophone({
  size = "default",
  className,
  color,
  showStatus = false,
}: VowelMicrophoneProps) {
  const { state, toggleSession, client } = useVowel();

  // Don't render if client is not available yet
  if (!client) {
    return null;
  }

  // Log state changes for debugging
  useEffect(() => {
    console.log("🎤 [VowelMicrophone] State updated:", {
      isConnected: state.isConnected,
      isConnecting: state.isConnecting,
      isUserSpeaking: state.isUserSpeaking,
      isAIThinking: state.isAIThinking,
      isToolExecuting: state.isToolExecuting,
      isAISpeaking: state.isAISpeaking,
      status: state.status,
    });
  }, [
    state.isConnected,
    state.isConnecting,
    state.isUserSpeaking,
    state.isAIThinking,
    state.isToolExecuting,
    state.isAISpeaking,
    state.status,
  ]);

  const sizeClasses = {
    small: "w-10 h-10",
    default: "w-12 h-12",
    large: "w-16 h-16",
  };

  const iconSizes = {
    small: "w-4 h-4",
    default: "w-5 h-5",
    large: "w-6 h-6",
  };

  // State-specific colors and styling
  const getButtonColor = () => {
    if (color) return color;
    
    if (state.isConnected) {
      if (state.isAISpeaking) return "bg-purple-500 hover:bg-purple-600";
      // Tool executing: slightly different shade of yellow (amber/orange-yellow)
      if (state.isToolExecuting) return "bg-amber-500 hover:bg-amber-600";
      if (state.isAIThinking) return "bg-yellow-500 hover:bg-yellow-600";
      if (state.isUserSpeaking) return "bg-blue-500 hover:bg-blue-600";
      console.log("🟢 [VowelMicrophone] Connected and idle - should be GREEN");
      return "bg-green-500 hover:bg-green-600"; // Ready/idle state - clearly visible green
    }
    
    console.log("⚪ [VowelMicrophone] Disconnected - should be GRAY");
    return "bg-base-300 hover:bg-base-content/20"; // Disconnected
  };

  // Get ring styling for current state
  const getRingClass = () => {
    if (state.isAISpeaking) return "ring-4 ring-purple-400/50";
    // Tool executing: amber ring
    if (state.isToolExecuting) return "ring-4 ring-amber-400/50";
    if (state.isAIThinking) return "ring-4 ring-yellow-400/50";
    if (state.isUserSpeaking) return "ring-4 ring-blue-400/50";
    if (state.isConnected) return "ring-2 ring-green-400/50";
    return "";
  };

  // Get icon color for current state
  const getIconColor = () => {
    if (state.isAISpeaking || state.isAIThinking || state.isToolExecuting || state.isUserSpeaking) {
      return "text-white";
    }
    if (state.isConnected) return "text-white"; // White icon on green background
    return "text-base-content";
  };

  // Should show pulse animation
  const shouldPulse = () => {
    return state.isUserSpeaking || state.isAISpeaking;
  };

  // Get icon to display
  const getIcon = () => {
    const IconComponent = Loader2;
    const iconSize = iconSizes[size];
    
    if (state.isConnecting) {
      return <IconComponent className={cn(iconSize, getIconColor(), "animate-spin")} />;
    }
    
    // Tool executing: show wrench icon
    if (state.isToolExecuting) {
      return <Wrench className={cn(iconSize, getIconColor())} />;
    }
    
    // AI thinking: show mic (or could show brain icon)
    if (state.isAIThinking) {
      return <Mic className={cn(iconSize, getIconColor())} />;
    }
    
    if (state.isConnected) {
      return <Mic className={cn(iconSize, getIconColor())} />;
    }
    
    return <MicOff className={cn(iconSize, getIconColor())} />;
  };

  // State-specific title
  const getTitle = () => {
    if (state.isAISpeaking) return "AI Speaking";
    if (state.isToolExecuting) return "Executing Tool";
    if (state.isAIThinking) return "AI Thinking";
    if (state.isUserSpeaking) return "You're Speaking";
    return state.status || "Voice assistant";
  };

  // State-specific status text
  const getStatusText = () => {
    if (state.isAISpeaking) return "🔊 AI Speaking";
    if (state.isToolExecuting) return "🔧 Executing Tool";
    if (state.isAIThinking) return "🧠 AI Thinking";
    if (state.isUserSpeaking) return "🎤 Listening";
    return state.status;
  };

  // Only disable when disconnected AND connecting (to prevent double-connection)
  // Always allow clicks when connected (to allow disconnection at any state)
  const isDisabled = !state.isConnected && state.isConnecting;

  return (
    <div className={cn("", className)}>
      <button
        onClick={toggleSession}
        disabled={isDisabled}
        // style={{
        //   width: "40px",
        //   height: "40px",
        // }}
        className={cn(
          "rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative",
          sizeClasses[size],
          getButtonColor(),
          getRingClass(),
          shouldPulse() && "animate-pulse",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        title={getTitle()}
        aria-label={state.isConnected ? "Stop voice session" : "Start voice session"}
      >
        {/* Ping effect for speaking states only */}
        {shouldPulse() && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-40 bg-current pointer-events-none" />
        )}

        {/* Icon - shows wrench when tool executing, mic when thinking, etc. */}
        <span className="relative z-10">
          {getIcon()}
        </span>
      </button>

      {showStatus && (
        <span className={cn(
          "text-sm font-medium transition-colors",
          state.isAISpeaking && "text-purple-600 dark:text-purple-400",
          state.isAIThinking && !state.isAISpeaking && "text-yellow-600 dark:text-yellow-400",
          state.isUserSpeaking && !state.isAIThinking && !state.isAISpeaking && "text-blue-600 dark:text-blue-400",
          !state.isAISpeaking && !state.isAIThinking && !state.isUserSpeaking && "text-gray-600 dark:text-gray-400"
        )}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}
