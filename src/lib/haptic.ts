/**
 * Haptic feedback utility using the Web Vibration API.
 * Silently no-ops on unsupported devices.
 */
export const haptic = {
  light: () => navigator.vibrate?.(30),
  medium: () => navigator.vibrate?.(50),
  success: () => navigator.vibrate?.([40, 30, 40]),
  error: () => navigator.vibrate?.([60, 40, 60, 40, 60]),
  tap: () => navigator.vibrate?.(20),
};
