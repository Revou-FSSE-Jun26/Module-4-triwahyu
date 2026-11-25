"use client";

import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { isApiError } from "@/lib/errors";
import { notify } from "@/lib/toast";

/** Fixed, user-facing copy per status code. Raw server or exception text is never shown (FE-07). */
export function messageForStatus(
  statusCode: number,
  serverMessage?: string,
): string {
  if (statusCode === 0)
    return "Cannot reach the server. Check your connection and try again.";
  if (statusCode === 400 || statusCode === 422)
    return serverMessage || "Please check your input and try again.";
  if (statusCode === 401)
    return "Your session has expired. Please sign in again.";
  if (statusCode === 403) return "You don't have permission to do that.";
  if (statusCode === 404)
    return "We couldn't find that. It may have been deleted.";
  if (statusCode === 409)
    return serverMessage || "That conflicts with existing data.";
  if (statusCode === 429)
    return "Too many requests. Please wait a moment and try again.";
  if (statusCode >= 500)
    return "Something went wrong on our side. Please try again.";
  return "Something went wrong. Please try again.";
}

/** Returns a handler that toasts a friendly message for any thrown error and signs out on 401. */
export function useErrorHandler() {
  const { logout } = useAuth();

  return useCallback(
    (error: unknown) => {
      if (!isApiError(error)) {
        notify.error("An unexpected error occurred. Please try again.");
        return;
      }
      // Only validation-style statuses may show the server's own (safe, authored) message.
      notify.error(messageForStatus(error.statusCode, error.message));
      if (error.statusCode === 401) logout({ reason: "expired" });
    },
    [logout],
  );
}
