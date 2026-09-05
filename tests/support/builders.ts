import type { UserAccountProps } from '@/domain/auth/user-account';
import { UserAccount } from '@/domain/auth/user-account';
import type { ProcedureProps } from '@/domain/catalog/procedure';
import { Procedure } from '@/domain/catalog/procedure';
import type { PatientProps } from '@/domain/patient/patient';
import { Patient } from '@/domain/patient/patient';
import type { ProfessionalProps } from '@/domain/professional/professional';
import { Professional } from '@/domain/professional/professional';
import type { AppointmentProps } from '@/domain/scheduling/appointment';
import { Appointment } from '@/domain/scheduling/appointment';
import { Money } from '@/domain/shared/money';
import { TimeSlot } from '@/domain/shared/time-slot';

/**
 * Builders de domínio compartilhados (issue #114) — cada `build<Entity>`
 * produz uma entidade já `.create()`ada com defaults válidos, sobrescrevíveis
 * via `overrides`. Só para as 5 entidades mais transversais aos testes
 * (Patient, Professional, Appointment, Procedure, UserAccount); ver
 * `.specs/features/domain-fixture-builders/spec.md`.
 */

// hazard: contador monotônico evita colisão de email/registro entre chamadas na mesma suíte
let sequence = 0;
function nextSequence(): number {
  sequence += 1;
  return sequence;
}

export function buildPatient(overrides: Partial<PatientProps> = {}): Patient {
  const n = nextSequence();
  return Patient.create({
    fullName: `Paciente Teste ${n}`,
    email: `paciente${n}@example.com`,
    phone: '11999990000',
    ...overrides,
  });
}

export function buildProfessional(
  overrides: Partial<ProfessionalProps> = {},
): Professional {
  const n = nextSequence();
  return Professional.create({
    fullName: `Profissional Teste ${n}`,
    ...overrides,
  });
}

export function buildProcedure(
  overrides: Partial<ProcedureProps> = {},
): Procedure {
  const n = nextSequence();
  return Procedure.create({
    name: `Procedimento Teste ${n}`,
    priceCents: 10_000,
    durationMinutes: 30,
    ...overrides,
  });
}

export function buildUserAccount(
  overrides: Partial<UserAccountProps> = {},
): UserAccount {
  const n = nextSequence();
  return UserAccount.create({
    email: `usuario${n}@example.com`,
    passwordHash: 'scrypt$1$salt$hash',
    role: 'company_admin',
    clinicId: 'legacy-clinic',
    ...overrides,
  });
}

export function buildAppointment(
  overrides: Partial<AppointmentProps> = {},
): Appointment {
  const n = nextSequence();
  return Appointment.create({
    patientId: `patient-${n}`,
    slot: TimeSlot.create(
      new Date('2026-07-20T09:00:00Z'),
      new Date('2026-07-20T10:00:00Z'),
    ),
    procedure: 'Troca de bolsa',
    price: Money.fromCents(25_000),
    ...overrides,
  });
}
