import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or initialize the app SQLite database.
 * Tables are created lazily on first access.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync("guid.db");
  return db;
}

/**
 * Run all CREATE TABLE IF NOT EXISTS statements.
 * Safe to call multiple times — idempotent.
 */
export async function initDatabase(): Promise<void> {
  const database = getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleNumber TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      stepsJson TEXT NOT NULL,
      totalSteps INTEGER NOT NULL DEFAULT 0,
      cachedAt TEXT NOT NULL,
      lastAccessedAt TEXT NOT NULL,
      storageBytes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cached_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleNumber TEXT NOT NULL,
      stepNumber INTEGER NOT NULL,
      remoteUrl TEXT NOT NULL,
      localPath TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (articleNumber) REFERENCES cached_guides(articleNumber) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cached_images_article
      ON cached_images(articleNumber);

    CREATE INDEX IF NOT EXISTS idx_cached_guides_lru
      ON cached_guides(lastAccessedAt ASC);

    CREATE TABLE IF NOT EXISTS pending_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT
    );
  `);
}

// ── Pending Actions (Offline Queue) ─────────────────────────────────

export interface PendingAction {
  id: number;
  type: string;
  payload: string; // JSON string
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export type ActionType =
  | "save_product"
  | "unsave_product"
  | "guide_progress"
  | "chat_message";

/**
 * Add an action to the offline queue.
 * Enforces MAX_OFFLINE_QUEUE (100) — evicts oldest when full.
 */
export async function addAction(
  type: ActionType,
  payload: Record<string, unknown>
): Promise<void> {
  const database = getDatabase();

  const countResult = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_actions"
  );
  const count = countResult?.count ?? 0;
  if (count >= 100) {
    const overflow = count - 99;
    await database.runAsync(
      `DELETE FROM pending_actions WHERE id IN (
        SELECT id FROM pending_actions ORDER BY createdAt ASC LIMIT ?
      )`,
      overflow
    );
  }

  await database.runAsync(
    "INSERT INTO pending_actions (type, payload) VALUES (?, ?)",
    type,
    JSON.stringify(payload)
  );
}

/**
 * Get all pending actions ordered by creation time (oldest first).
 */
export async function getActions(): Promise<PendingAction[]> {
  const database = getDatabase();
  return database.getAllAsync<PendingAction>(
    "SELECT * FROM pending_actions ORDER BY createdAt ASC"
  );
}

/**
 * Remove a completed action from the queue.
 */
export async function removeAction(id: number): Promise<void> {
  const database = getDatabase();
  await database.runAsync("DELETE FROM pending_actions WHERE id = ?", id);
}

/**
 * Update an action's attempt count and last error.
 */
export async function updateAction(
  id: number,
  attempts: number,
  lastError: string | null
): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    "UPDATE pending_actions SET attempts = ?, lastError = ? WHERE id = ?",
    attempts,
    lastError,
    id
  );
}

/**
 * Get the count of pending actions.
 */
export async function getActionCount(): Promise<number> {
  const database = getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_actions"
  );
  return result?.count ?? 0;
}
