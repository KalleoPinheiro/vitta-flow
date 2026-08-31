import { and, asc, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import {
  SessionPackage,
  type SessionPackageRepository,
} from "@/domain/billing/package";
import type { AppDb } from "./db";
import { LEGACY_CLINIC_ID } from "./legacy-clinic";
import { packageConsumptions, sessionPackages } from "./schema";

export class DrizzleSessionPackageRepository implements SessionPackageRepository {
  constructor(private readonly db: AppDb) {}

  async save(pkg: SessionPackage): Promise<void> {
    const values = {
      id: pkg.id,
      clinicId: LEGACY_CLINIC_ID,
      patientId: pkg.patientId,
      procedureId: pkg.procedureId,
      totalSessions: pkg.totalSessions,
      usedSessions: pkg.usedSessions,
      priceCents: pkg.priceCents,
      expiresAt: pkg.expiresAt,
      active: pkg.isActive,
      createdAt: pkg.createdAt,
    };
    await this.db
      .insert(sessionPackages)
      .values(values)
      .onConflictDoUpdate({ target: sessionPackages.id, set: values });
  }

  async findById(id: string): Promise<SessionPackage | null> {
    const rows = await this.db
      .select()
      .from(sessionPackages)
      .where(eq(sessionPackages.id, id))
      .limit(1);
    return rows[0] ? SessionPackage.restore(rows[0]) : null;
  }

  async findByPatientId(patientId: string): Promise<SessionPackage[]> {
    const rows = await this.db
      .select()
      .from(sessionPackages)
      .where(eq(sessionPackages.patientId, patientId))
      .orderBy(desc(sessionPackages.createdAt));
    return rows.map((row) => SessionPackage.restore(row));
  }

  async findUsable(
    patientId: string,
    procedureId: string,
    now: Date = new Date(),
  ): Promise<SessionPackage | null> {
    const rows = await this.db
      .select()
      .from(sessionPackages)
      .where(
        and(
          eq(sessionPackages.patientId, patientId),
          eq(sessionPackages.procedureId, procedureId),
          eq(sessionPackages.active, true),
          gt(
            sql`${sessionPackages.totalSessions} - ${sessionPackages.usedSessions}`,
            0,
          ),
          // Validade (COMP3-08): expirado não consome; null = sem validade.
          or(isNull(sessionPackages.expiresAt), gt(sessionPackages.expiresAt, now)),
        ),
      )
      .orderBy(asc(sessionPackages.createdAt))
      .limit(1);
    return rows[0] ? SessionPackage.restore(rows[0]) : null;
  }

  async recordConsumption(packageId: string, appointmentId: string): Promise<void> {
    await this.db
      .insert(packageConsumptions)
      .values({ packageId, appointmentId, clinicId: LEGACY_CLINIC_ID, createdAt: new Date() })
      .onConflictDoNothing();
  }

  async wasConsumedBy(appointmentId: string): Promise<boolean> {
    const rows = await this.db
      .select({ packageId: packageConsumptions.packageId })
      .from(packageConsumptions)
      .where(eq(packageConsumptions.appointmentId, appointmentId))
      .limit(1);
    return rows.length > 0;
  }
}
