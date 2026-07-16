import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export const MOVEMENT_TYPES = ["in", "out"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface StockMovementProps {
  supplyId: string;
  type: MovementType;
  quantity: number;
  reason: string;
}

export interface StockMovementState extends StockMovementProps {
  id: string;
  createdAt: Date;
}

export class StockMovement {
  private constructor(private readonly state: StockMovementState) {}

  static create(props: StockMovementProps): StockMovement {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new ValidationError("Quantidade deve ser inteiro positivo");
    }
    const reason = props.reason.trim();
    if (reason.length === 0) {
      throw new ValidationError("Motivo da movimentação é obrigatório");
    }
    return new StockMovement({
      supplyId: props.supplyId,
      type: props.type,
      quantity: props.quantity,
      reason,
      id: newId(),
      createdAt: new Date(),
    });
  }

  static restore(state: StockMovementState): StockMovement {
    return new StockMovement({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get supplyId(): string {
    return this.state.supplyId;
  }

  get type(): MovementType {
    return this.state.type;
  }

  get quantity(): number {
    return this.state.quantity;
  }

  get reason(): string {
    return this.state.reason;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
