import { ValidationError } from '../shared/errors';
import { newId } from '../shared/id';

export interface SupplyBatchProps {
  supplyId: string;
  quantity: number;
  /** Identificação do lote do fornecedor (opcional). */
  label?: string | null;
  /** Validade do lote (opcional). */
  expiresAt?: Date | null;
}

export interface SupplyBatchState extends SupplyBatchProps {
  id: string;
  /** Quantidade ainda não consumida deste lote. */
  remaining: number;
  createdAt: Date;
}

/** Lote de entrada de insumo — base do consumo FEFO e do alerta de validade. */
export class SupplyBatch {
  private constructor(private readonly state: SupplyBatchState) {}

  static create(props: SupplyBatchProps): SupplyBatch {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new ValidationError('Quantidade do lote deve ser inteiro positivo');
    }
    return new SupplyBatch({
      supplyId: props.supplyId,
      quantity: props.quantity,
      label: props.label?.trim() || null,
      expiresAt: props.expiresAt ?? null,
      id: newId(),
      remaining: props.quantity,
      createdAt: new Date(),
    });
  }

  static restore(state: SupplyBatchState): SupplyBatch {
    return new SupplyBatch({ ...state });
  }

  /** Consome até `qty` unidades; retorna o lote atualizado e o que faltou consumir. */
  consume(qty: number): { batch: SupplyBatch; leftover: number } {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ValidationError(
        'Quantidade a consumir deve ser inteiro positivo',
      );
    }
    const consumed = Math.min(this.state.remaining, qty);
    return {
      batch: new SupplyBatch({
        ...this.state,
        remaining: this.state.remaining - consumed,
      }),
      leftover: qty - consumed,
    };
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt != null && this.expiresAt.getTime() <= now.getTime();
  }

  expiresWithinDays(days: number, now: Date = new Date()): boolean {
    if (this.expiresAt == null) {
      return false;
    }
    const limit = now.getTime() + days * 86_400_000;
    return this.expiresAt.getTime() <= limit;
  }

  get id(): string {
    return this.state.id;
  }

  get supplyId(): string {
    return this.state.supplyId;
  }

  get quantity(): number {
    return this.state.quantity;
  }

  get remaining(): number {
    return this.state.remaining;
  }

  get label(): string | null {
    return this.state.label ?? null;
  }

  get expiresAt(): Date | null {
    return this.state.expiresAt ?? null;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
