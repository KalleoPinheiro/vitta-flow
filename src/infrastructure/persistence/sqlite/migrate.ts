import type { Database } from "better-sqlite3";

export function migrate(db: Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      birth_date TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      procedure TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      appointment_id TEXT,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      due_date TEXT,
      paid_at TEXT,
      payment_method TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON invoices(issued_at);
  `);
}
