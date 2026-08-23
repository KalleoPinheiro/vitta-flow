"use client";

import type { AppointmentDto } from "@/lib/dto";
import { formatTime } from "@/lib/format";
import { Button, Card } from "@still-void/ui/react";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-info-soft text-info border-info",
  confirmed: "bg-accent-soft text-accent-ink border-accent",
  completed: "bg-success-soft text-success border-success",
  cancelled: "bg-surface-2 text-ink-3 border-border line-through",
  no_show: "bg-warning-soft text-warning border-warning",
};

export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function buildMonthDays(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

interface CalendarGridProps {
  monthDate: Date;
  appointments: AppointmentDto[];
  onDayClick: (day: Date) => void;
  onAppointmentClick: (appointment: AppointmentDto) => void;
}

export function CalendarGrid({
  monthDate,
  appointments,
  onDayClick,
  onAppointmentClick,
}: CalendarGridProps) {
  const days = buildMonthDays(monthDate);
  const todayKey = dayKey(new Date());

  const byDay = new Map<string, AppointmentDto[]>();
  for (const appointment of appointments) {
    const key = dayKey(new Date(appointment.startsAt));
    byDay.set(key, [...(byDay.get(key) ?? []), appointment]);
  }

  return (
    <div className="overflow-x-auto">
      <Card className="min-w-[840px] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-bg">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2 text-center text-xs font-semibold uppercase text-ink-3">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = dayKey(day);
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
            const dayAppointments = (byDay.get(key) ?? []).sort((a, b) =>
              a.startsAt.localeCompare(b.startsAt),
            );
            return (
              <div
                key={key}
                onClick={() => onDayClick(day)}
                className={`min-h-24 cursor-pointer border-b border-r border-border p-1.5 align-top transition hover:bg-accent-soft/50 ${
                  isCurrentMonth ? "" : "bg-bg/70 text-ink-3"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    key === todayKey ? "bg-accent-ink text-white" : ""
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {dayAppointments.map((appointment) => (
                    <Button
                      key={appointment.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAppointmentClick(appointment);
                      }}
                      title={`${formatTime(appointment.startsAt)} ${appointment.patientName ?? ""} — ${appointment.procedure}`}
                      variant="outline"
                      className={`h-auto w-full truncate rounded border-0 px-1.5 py-0.5 text-left text-xs font-normal ${
                        STATUS_COLORS[appointment.status] ?? "bg-surface-2"
                      }`}
                    >
                      {formatTime(appointment.startsAt)} {appointment.patientName}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
