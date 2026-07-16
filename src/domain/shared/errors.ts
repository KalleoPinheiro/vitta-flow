export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
}

export class InvalidMoneyError extends DomainError {
  readonly code = "INVALID_MONEY";
}

export class InvalidTimeSlotError extends DomainError {
  readonly code = "INVALID_TIME_SLOT";
}

export class InvalidStatusTransitionError extends DomainError {
  readonly code = "INVALID_STATUS_TRANSITION";
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";

  constructor(entity: string, id: string) {
    super(`${entity} não encontrado(a): ${id}`);
  }
}

export class SchedulingConflictError extends DomainError {
  readonly code = "SCHEDULING_CONFLICT";
}
