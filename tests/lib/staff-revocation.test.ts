import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/auth/session';
import {
  clearStaffRevocationCache,
  isStaffSessionRevoked,
  REVOCATION_CACHE_TTL_MS,
} from '@/lib/auth/staff-revocation';

const adminSession = (subject: string): Session => ({
  expiresAtMs: Date.now() + 60_000,
  subject,
  role: 'company_admin',
  clinicId: 'legacy-clinic',
  professionalId: null,
});

describe('Feature: Revogação de sessão de conta staff desativada (SEC1-01..04)', () => {
  beforeEach(() => {
    clearStaffRevocationCache();
  });

  it('Dado conta existente e inativa, Quando checar, Então sessão revogada', async () => {
    const lookup = vi.fn().mockResolvedValue({ isActive: false });

    expect(
      await isStaffSessionRevoked(adminSession('ana@clinica.com'), lookup),
    ).toBe(true);
  });

  it('Dado conta existente e ativa, Quando checar, Então sessão válida', async () => {
    const lookup = vi.fn().mockResolvedValue({ isActive: true });

    expect(
      await isStaffSessionRevoked(adminSession('ana@clinica.com'), lookup),
    ).toBe(false);
  });

  it("Dado subject 'local' (senha master), Quando checar, Então válida sem consultar o banco", async () => {
    const lookup = vi.fn();

    expect(await isStaffSessionRevoked(adminSession('local'), lookup)).toBe(
      false,
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it('Dado email sem conta (login Google via allowlist), Quando checar, Então válida (deny-list, AD-001)', async () => {
    const lookup = vi.fn().mockResolvedValue(null);

    expect(
      await isStaffSessionRevoked(adminSession('google@clinica.com'), lookup),
    ).toBe(false);
  });

  it('Dado papel patient/partner, Quando checar, Então válida sem consultar o banco', async () => {
    const lookup = vi.fn();
    const patient: Session = {
      expiresAtMs: Date.now() + 60_000,
      subject: 'p@x.com',
      role: 'patient',
      clinicId: 'legacy-clinic',
      professionalId: null,
    };
    const partner: Session = {
      expiresAtMs: Date.now() + 60_000,
      subject: 'd@x.com',
      role: 'partner',
      clinicId: 'legacy-clinic',
      professionalId: null,
    };

    expect(await isStaffSessionRevoked(patient, lookup)).toBe(false);
    expect(await isStaffSessionRevoked(partner, lookup)).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('Dado checagem repetida dentro de 60s, Quando checar de novo, Então usa cache (uma consulta só)', async () => {
    const lookup = vi.fn().mockResolvedValue({ isActive: false });
    const now = Date.now();

    await isStaffSessionRevoked(adminSession('ana@clinica.com'), lookup, now);
    const revoked = await isStaffSessionRevoked(
      adminSession('ana@clinica.com'),
      lookup,
      now + 30_000,
    );

    expect(revoked).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('Dado cache expirado, Quando checar de novo, Então consulta o banco novamente', async () => {
    const lookup = vi.fn().mockResolvedValue({ isActive: true });
    const now = Date.now();

    await isStaffSessionRevoked(adminSession('ana@clinica.com'), lookup, now);
    await isStaffSessionRevoked(
      adminSession('ana@clinica.com'),
      lookup,
      now + REVOCATION_CACHE_TTL_MS,
    );

    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('Dado falha na consulta, Quando checar, Então fail-open com log (AD-004)', async () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const lookup = vi.fn().mockRejectedValue(new Error('db fora'));

    expect(
      await isStaffSessionRevoked(adminSession('ana@clinica.com'), lookup),
    ).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
