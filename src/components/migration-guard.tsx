"use client";

import { useEffect } from "react";
import { isMigrationNeeded, runMigration } from "@/lib/migrate-indexeddb";

// Runs the one-time IndexedDB → file system migration silently in the background.
// Does NOT block page rendering.
export function MigrationGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      if (!isMigrationNeeded()) return;
      runMigration().catch((error: unknown) => {
        console.warn("Migration failed, will retry on next load:", error);
      });
    } catch {
      // Never let migration errors surface to React's error boundary
    }
  }, []);

  return <>{children}</>;
}
