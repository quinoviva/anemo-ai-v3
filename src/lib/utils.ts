import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Translates backend error codes/messages into user-friendly frontend messages.
 * Prevents raw technical details from being exposed to the end user.
 */
export function getErrorMessage(error: any, defaultMessage: string = "Something went wrong. Please try again."): string {
  if (!error) return defaultMessage;

  const code = error.code || error.message || "";
  
  // Auth Errors
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
    return "Invalid email or password.";
  }
  if (code.includes('auth/email-already-in-use')) {
    return "This email is already registered.";
  }
  if (code.includes('auth/weak-password')) {
    return "Password is too weak. Please use at least 8 characters.";
  }
  if (code.includes('auth/too-many-requests')) {
    return "Too many failed attempts. Please try again later.";
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return "Sign-in was cancelled. Please try again.";
  }
  if (code.includes('auth/network-request-failed')) {
    return "Network error. Please check your internet connection.";
  }
  if (code.includes('auth/operation-not-allowed')) {
    return "This sign-in method is currently disabled.";
  }

  // Firestore / General Errors
  if (code.includes('permission-denied')) {
    return "You don't have permission to perform this action.";
  }
  if (code.includes('not-found')) {
    return "The requested information could not be found.";
  }
  if (code.includes('unavailable')) {
    return "The service is temporarily unavailable. Please try again later.";
  }

  return defaultMessage;
}
