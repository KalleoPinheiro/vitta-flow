import { InvalidTimeSlotError } from "./errors";

const MS_PER_MINUTE = 60_000;

export class TimeSlot {
  private constructor(
    readonly start: Date,
    readonly end: Date,
  ) {}

  static create(start: Date, end: Date): TimeSlot {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new InvalidTimeSlotError("Datas do horário são inválidas");
    }
    if (end.getTime() <= start.getTime()) {
      throw new InvalidTimeSlotError("Fim do horário deve ser depois do início");
    }
    return new TimeSlot(new Date(start), new Date(end));
  }

  get durationMinutes(): number {
    return (this.end.getTime() - this.start.getTime()) / MS_PER_MINUTE;
  }

  expand(marginMinutes: number): TimeSlot {
    return new TimeSlot(
      new Date(this.start.getTime() - marginMinutes * MS_PER_MINUTE),
      new Date(this.end.getTime() + marginMinutes * MS_PER_MINUTE),
    );
  }

  overlaps(other: TimeSlot): boolean {
    return this.start.getTime() < other.end.getTime() && other.start.getTime() < this.end.getTime();
  }
}
