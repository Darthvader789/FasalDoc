import { open } from 'react-native-quick-sqlite';
import { ScanRecord, ScanStatus } from '../store/useHistoryStore';

const DB_NAME = 'fasaldoc.db';

let db: ReturnType<typeof open> | null = null;

const getDB = () => {
  if (!db) {
    db = open({ name: DB_NAME });
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  const database = getDB();
  database.execute(`
    CREATE TABLE IF NOT EXISTS scan_history (
      id TEXT PRIMARY KEY,
      disease_name TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      confidence REAL NOT NULL,
      stage TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      scan_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      treatment_id TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      severity TEXT DEFAULT 'medium'
    );
  `);
};

export const insertScan = async (record: ScanRecord): Promise<void> => {
  const database = getDB();
  database.execute(
    `INSERT OR REPLACE INTO scan_history
      (id, disease_name, crop_name, confidence, stage, image_uri, scan_date, status, treatment_id, synced, description, severity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      record.id,
      record.diseaseName,
      record.cropName,
      record.confidence,
      record.stage,
      record.imageUri,
      record.scanDate,
      record.status,
      record.treatmentId,
      record.synced,
      record.description ?? '',
      record.severity ?? 'medium',
    ],
  );
};

export const getAllScans = async (): Promise<ScanRecord[]> => {
  const database = getDB();
  const result = database.execute(
    'SELECT * FROM scan_history ORDER BY scan_date DESC;',
  );
  return (result.rows?._array ?? []).map(rowToRecord);
};

export const getScanById = async (id: string): Promise<ScanRecord | null> => {
  const database = getDB();
  const result = database.execute(
    'SELECT * FROM scan_history WHERE id = ?;',
    [id],
  );
  const rows = result.rows?._array ?? [];
  return rows.length > 0 ? rowToRecord(rows[0]) : null;
};

export const updateScanStatus = async (id: string, status: ScanStatus): Promise<void> => {
  const database = getDB();
  database.execute(
    'UPDATE scan_history SET status = ? WHERE id = ?;',
    [status, id],
  );
};

export const getUnsynced = async (): Promise<ScanRecord[]> => {
  const database = getDB();
  const result = database.execute(
    'SELECT * FROM scan_history WHERE synced = 0;',
  );
  return (result.rows?._array ?? []).map(rowToRecord);
};

export const markSynced = async (id: string): Promise<void> => {
  const database = getDB();
  database.execute(
    'UPDATE scan_history SET synced = 1 WHERE id = ?;',
    [id],
  );
};

const rowToRecord = (row: Record<string, unknown>): ScanRecord => ({
  id: row.id as string,
  diseaseName: row.disease_name as string,
  cropName: row.crop_name as string,
  confidence: row.confidence as number,
  stage: row.stage as string,
  imageUri: row.image_uri as string,
  scanDate: row.scan_date as string,
  status: row.status as ScanStatus,
  treatmentId: row.treatment_id as string,
  synced: row.synced as 0 | 1,
  description: row.description as string | undefined,
  severity: row.severity as 'low' | 'medium' | 'high' | undefined,
});
