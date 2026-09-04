import { ValidationError } from './errors';

const MIN_NAME_LENGTH = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PersonContact {
  fullName: string;
  email: string;
  phone: string;
}

/** Validação/normalização comum a pessoas do domínio (Patient, Partner). */
export function validatePersonContact(props: PersonContact): PersonContact {
  const fullName = props.fullName.trim();
  const email = props.email.trim().toLowerCase();
  const phone = props.phone.trim();

  if (fullName.length < MIN_NAME_LENGTH) {
    throw new ValidationError(
      `Nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres`,
    );
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(`Email inválido: ${props.email}`);
  }
  if (phone.length === 0) {
    throw new ValidationError('Telefone é obrigatório');
  }

  return { fullName, email, phone };
}
