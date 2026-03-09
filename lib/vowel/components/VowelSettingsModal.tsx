/**
 * @fileoverview Vowel Settings Modal Component
 * 
 * Settings modal for voice agent configuration with microphone selection.
 * Allows users to select and switch between available microphone devices.
 * 
 * This component is self-contained and automatically manages device loading,
 * device switching, and session state. It can work with either:
 * - VowelProvider context (via useVowel hook)
 * - Explicit client prop
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState, useEffect, useCallback } from 'react';
import { Settings, Mic, Moon, Sun } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../utils';
import { useVowel } from './VowelProviderSimple';
import { getOperatingSystem } from '../utils/device-detection';
import type { Vowel } from '../core/VowelClient';

/**
 * Mock data for Storybook (internal use only)
 */
export interface VowelSettingsModalMock {
  /** Mock devices to display */
  devices?: MediaDeviceInfo[];
  /** Mock selected device ID */
  selectedDeviceId?: string;
  /** Mock current device label */
  currentDeviceLabel?: string;
  /** Mock loading state */
  isLoading?: boolean;
}

/**
 * VowelSettingsModal component props
 */
export interface VowelSettingsModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Optional Vowel client instance (will use useVowel() hook if not provided) */
  client?: Vowel | null;
  
  /** Custom className */
  className?: string;
  
  /** @internal Mock data for Storybook (not part of public API) */
  __mock?: VowelSettingsModalMock;
}

/**
 * VowelSettingsModal Component
 * 
 * Self-contained settings modal that automatically manages microphone devices.
 * Works with VowelProvider context or explicit client prop.
 * 
 * @example With VowelProvider (automatic)
 * ```tsx
 * <VowelProvider client={vowel}>
 *   <VowelSettingsModal
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *   />
 * </VowelProvider>
 * ```
 * 
 * @example With explicit client prop
 * ```tsx
 * <VowelSettingsModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   client={vowelClient}
 * />
 * ```
 */
export function VowelSettingsModal({
  isOpen,
  onClose,
  client: clientProp,
  className,
  __mock,
}: VowelSettingsModalProps) {
  // Mock mode - use mock data if provided
  const isMockMode = !!__mock;
  
  // Try to get client from context (skip in mock mode)
  // Note: useVowel() will throw if not in provider - we'll handle that
  let contextClient: Vowel | null = null;
  if (!isMockMode) {
    try {
      const context = useVowel();
      contextClient = context?.client || null;
    } catch {
      // Not in VowelProvider - that's okay, will use prop or show error
      contextClient = null;
    }
  }
  
  // Use prop if provided, otherwise use context (null in mock mode)
  const client = isMockMode ? null : (clientProp || contextClient);

  // Internal state management
  const [devices, setDevices] = useState<MediaDeviceInfo[]>(__mock?.devices || []);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(__mock?.selectedDeviceId || null);
  const [currentDeviceLabel, setCurrentDeviceLabel] = useState<string | null>(__mock?.currentDeviceLabel || null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(__mock?.isLoading || false);
  const [isChangingDevice, setIsChangingDevice] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const isIOS = getOperatingSystem() === 'ios';

  // Initialize dark mode state from client
  useEffect(() => {
    if (!isMockMode && client) {
      setIsDarkMode(client.getDarkMode());
    }
  }, [client, isMockMode]);

  // Auto-load devices when modal opens (skip in mock mode)
  useEffect(() => {
    if (isMockMode) {
      // In mock mode, use mock data
      if (__mock?.devices) {
        setDevices(__mock.devices);
      }
      if (__mock?.selectedDeviceId) {
        setSelectedDeviceId(__mock.selectedDeviceId);
      }
      if (__mock?.currentDeviceLabel) {
        setCurrentDeviceLabel(__mock.currentDeviceLabel);
      }
      setIsLoadingDevices(__mock?.isLoading || false);
      return;
    }

    if (!isOpen || !client) {
      // Reset state when modal closes
      if (!isOpen) {
        setDevices([]);
        setSelectedDeviceId(null);
        setCurrentDeviceLabel(null);
        setIsLoadingDevices(false);
        setIsChangingDevice(false);
      }
      return;
    }

    const loadDevices = async () => {
      setIsLoadingDevices(true);
      setNeedsPermission(false);
      
      try {
        // First check if we have permission (without triggering getUserMedia)
        const hasPermission = await client.hasMicrophonePermission();
        
        // Get devices - don't require permission in useEffect (not a user gesture on iOS)
        const availableDevices = await client.getAvailableMicrophones(false);
        
        // Check if devices have labels (indicates permission was granted)
        const hasLabels = availableDevices.some(d => d.label && d.label.length > 0);
        
        if (availableDevices.length === 0 || (!hasLabels && !hasPermission)) {
          // No devices or no labels - need to request permission
          // On iOS, this MUST be done via a button click (user gesture)
          setNeedsPermission(true);
          setDevices([]);
        } else {
          setDevices(availableDevices);
          
          const currentDevice = client.getCurrentMicrophone();
          if (currentDevice) {
            setSelectedDeviceId(currentDevice.deviceId);
            setCurrentDeviceLabel(currentDevice.label || 'Default Microphone');
          } else if (availableDevices.length > 0) {
            // No current device, use first available
            setSelectedDeviceId(availableDevices[0].deviceId);
            setCurrentDeviceLabel(availableDevices[0].label || 'Default Microphone');
          }
        }
      } catch (error) {
        console.error('Error loading devices:', error);
        setNeedsPermission(true);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    loadDevices();
  }, [isOpen, client, isMockMode, __mock]);

  // Handler for requesting permission (must be called from user gesture)
  const handleRequestPermission = useCallback(async () => {
    if (!client) return;
    
    setIsRequestingPermission(true);
    try {
      const granted = await client.requestMicrophonePermission();
      if (granted) {
        // Permission granted - reload devices with labels
        const availableDevices = await client.getAvailableMicrophones(false);
        setDevices(availableDevices);
        setNeedsPermission(false);
        
        if (availableDevices.length > 0) {
          setSelectedDeviceId(availableDevices[0].deviceId);
          setCurrentDeviceLabel(availableDevices[0].label || 'Default Microphone');
        }
      } else {
        console.warn('Microphone permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  }, [client]);

  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    if (!isMockMode && client) {
      client.toggleDarkMode();
      setIsDarkMode(client.getDarkMode());
    } else {
      // Mock mode - just toggle local state
      setIsDarkMode(!isDarkMode);
    }
  };

  // Handle device change
  const handleDeviceChange = async (deviceId: string) => {
    // In mock mode, just update local state
    if (isMockMode) {
      setSelectedDeviceId(deviceId);
      const device = devices.find(d => d.deviceId === deviceId);
      if (device) {
        setCurrentDeviceLabel(device.label || 'Unknown Device');
      }
      return;
    }

    if (!client) return;

    setSelectedDeviceId(deviceId);
    setIsChangingDevice(true);

    try {
      // Check if session is active - if so, switch device
      // If not, just set preference for next connection
      const state = client.state;
      
      if (state.isConnected) {
        // Active session - switch device (will restart audio stream)
        await client.switchMicrophoneDevice(deviceId);
      } else {
        // No active session - just set preference
        client.setMicrophoneDevice(deviceId);
      }

      // Update current device label
      const device = devices.find(d => d.deviceId === deviceId);
      if (device) {
        setCurrentDeviceLabel(device.label || 'Unknown Device');
      }
    } catch (error) {
      console.error('Error switching device:', error);
      // Revert selection on error
      const currentDevice = client.getCurrentMicrophone();
      if (currentDevice) {
        setSelectedDeviceId(currentDevice.deviceId);
        setCurrentDeviceLabel(currentDevice.label || 'Default Microphone');
      }
    } finally {
      setIsChangingDevice(false);
    }
  };

  // Show error if no client available (skip in mock mode)
  if (!isMockMode && !client) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} className={cn('max-w-md', className)}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Settings
            </h2>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            Vowel client not available. Please ensure VowelProvider is set up correctly or pass a client prop.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={cn('max-w-md', className)}
    >
      <div className="space-y-4">
        {/* Header with Settings icon */}
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
        </div>

        {/* Dark Mode Toggle */}
        <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Appearance
          </label>
          <button
            onClick={handleDarkModeToggle}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3',
              'border border-gray-300 dark:border-gray-600 rounded-md',
              'bg-white dark:bg-gray-800',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'transition-colors',
              'text-sm font-medium text-gray-900 dark:text-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
              <span>Dark Mode</span>
            </div>
            <div className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
            )}>
              <div className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                isDarkMode ? 'translate-x-5' : 'translate-x-0'
              )} />
            </div>
          </button>
        </div>

        {/* Microphone Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Microphone
          </label>
          
          {/* Permission request UI - shown when we need microphone permission */}
          {needsPermission && !isLoadingDevices ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isIOS 
                  ? "Tap the button below to allow microphone access. This is required to detect available microphones."
                  : "Microphone access is required to detect available devices."
                }
              </p>
              <button
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2',
                  'bg-blue-600 dark:bg-blue-500 text-white rounded-md',
                  'hover:bg-blue-700 dark:hover:bg-blue-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
                  'text-sm font-medium',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                <Mic className="w-4 h-4" />
                {isRequestingPermission ? 'Requesting access...' : 'Allow Microphone Access'}
              </button>
            </div>
          ) : (
            <>
              <select
                value={selectedDeviceId || ''}
                onChange={(e) => handleDeviceChange(e.target.value)}
                disabled={isLoadingDevices || isChangingDevice || devices.length === 0}
                className={cn(
                  'w-full px-3 py-2',
                  'border border-gray-300 dark:border-gray-600 rounded-md',
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent',
                  'text-sm',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {isLoadingDevices ? (
                  <option value="">Loading devices...</option>
                ) : devices.length === 0 ? (
                  <option value="">No microphones available</option>
                ) : (
                  devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))
                )}
              </select>
              
              {isChangingDevice && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  Switching device...
                </p>
              )}
              
              {currentDeviceLabel && !isChangingDevice && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Current: {currentDeviceLabel}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

