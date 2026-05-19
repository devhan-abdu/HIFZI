import type { PostgrestError } from "@supabase/supabase-js";
import type { RemoteSyncRow } from "./types";

export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  const message =
    "message" in error
      ? String((error as { message?: string }).message).toLowerCase()
      : "";
  return code === "401" || code === "PGRST301" || message.includes("jwt");
}

export function isConstraintError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  return error.code === "23503" || error.code === "23505";
}

export function remoteVersion(row: RemoteSyncRow): number {
  return Number(row.sync_version ?? 0);
}

export function remoteUpdatedAt(row: RemoteSyncRow): string {
  return row.updated_at ?? row.created_at ?? new Date(0).toISOString();
}

export function compareUpdatedAt(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let attempt = 0;
  let delay = 2000;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) throw error;
      await sleep(delay);
      delay *= 2;
    }
  }
}
