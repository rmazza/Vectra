import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PRESET_TOWER_COST = 65;

export const VALID_TRIGGERS = new Set(['PULSE', 'BEAM', 'NOVA']);
export const VALID_PAYLOADS = new Set(['KINETIC', 'CRYO', 'CORRODE']);
export const VALID_MODIFIERS = new Set(['NONE', 'CHAIN', 'PIERCE', 'SPLASH']);

interface PresetRow {
  id: string;
  name: string;
  trigger: string;
  payload: string;
  modifier: string;
  cost: number;
  created_at: number;
}

export interface StoredTowerPreset {
  id: string;
  name: string;
  trigger: string;
  payload: string;
  modifier: string;
  cost: number;
  createdAt: number;
}

function mapPresetRow(row: PresetRow): StoredTowerPreset {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    payload: row.payload,
    modifier: row.modifier,
    cost: row.cost,
    createdAt: row.created_at,
  };
}

export class PresetDatabase {
  private readonly db: Database.Database;
  private readonly selectAllStmt: Database.Statement<[], PresetRow>;
  private readonly insertStmt: Database.Statement<
    [string, string, string, string, string, number, number]
  >;
  private readonly deleteStmt: Database.Statement<[string]>;

  constructor(dbPath?: string) {
    const resolvedPath =
      dbPath ?? path.resolve(__dirname, '..', 'data', 'vectra.sqlite');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tower_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger TEXT NOT NULL,
        payload TEXT NOT NULL,
        modifier TEXT NOT NULL,
        cost INTEGER NOT NULL DEFAULT ${PRESET_TOWER_COST},
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tower_presets_created_at
        ON tower_presets (created_at DESC);
    `);

    this.seedStartersIfNeeded();

    this.selectAllStmt = this.db.prepare<[], PresetRow>(
      'SELECT id, name, trigger, payload, modifier, cost, created_at FROM tower_presets ORDER BY created_at DESC'
    );
    this.insertStmt = this.db.prepare<
      [string, string, string, string, string, number, number]
    >(
      'INSERT INTO tower_presets (id, name, trigger, payload, modifier, cost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    this.deleteStmt = this.db.prepare<[string]>(
      'DELETE FROM tower_presets WHERE id = ?'
    );
  }

  private seedStartersIfNeeded(): void {
    const seeded = this.db
      .prepare<[string], { value: string }>(
        'SELECT value FROM app_meta WHERE key = ?'
      )
      .get('presets_seeded');

    if (seeded) return;

    const insertStarter = this.db.prepare(
      'INSERT OR IGNORE INTO tower_presets (id, name, trigger, payload, modifier, cost, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const markSeeded = this.db.prepare(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)'
    );

    const seedTx = this.db.transaction(() => {
      const now = Date.now();
      const starters = [
        ['preset_shredder', 'Shredder', 'BEAM', 'CORRODE', 'CHAIN', PRESET_TOWER_COST, now - 3000],
        ['preset_frostburst', 'Frostburst', 'NOVA', 'CRYO', 'SPLASH', PRESET_TOWER_COST, now - 2000],
        ['preset_railgun', 'Railgun', 'PULSE', 'KINETIC', 'PIERCE', PRESET_TOWER_COST, now - 1000],
      ] as const;

      for (const row of starters) {
        insertStarter.run(...row);
      }
      markSeeded.run('presets_seeded', '1');
    });

    seedTx();
  }

  public listPresets(): StoredTowerPreset[] {
    return this.selectAllStmt.all().map(mapPresetRow);
  }

  public createPreset(input: {
    name: string;
    trigger: string;
    payload: string;
    modifier: string;
  }): StoredTowerPreset {
    const id = `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = Date.now();
    this.insertStmt.run(
      id,
      input.name,
      input.trigger,
      input.payload,
      input.modifier,
      PRESET_TOWER_COST,
      createdAt
    );

    return {
      id,
      name: input.name,
      trigger: input.trigger,
      payload: input.payload,
      modifier: input.modifier,
      cost: PRESET_TOWER_COST,
      createdAt,
    };
  }

  public deletePreset(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  public close(): void {
    if (this.db.open) {
      this.db.close();
    }
  }
}
