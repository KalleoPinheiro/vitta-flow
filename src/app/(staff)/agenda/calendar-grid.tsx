"use client";

import type { AppointmentDto } from "@/lib/dto";
import { formatTime } from "@/lib/format";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-900 border-sky-300",
  confirmed: "bg-teal-100 text-teal-900 border-teal-300",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  no_show: "bg-amber-100 text-amber-900 border-amber-300",
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
      <div className="min-w-[840px] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2 text-center text-xs font-semibold uppercase text-slate-500">
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
                className={`min-h-24 cursor-pointer border-b border-r border-slate-100 p-1.5 align-top transition hover:bg-teal-50/50 ${
                  isCurrentMonth ? "" : "bg-slate-50/70 text-slate-400"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    key === todayKey ? "bg-teal-700 text-white" : ""
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 flex flex-col gap-1">
                  {dayAppointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAppointmentClick(appointment);
                      }}
                      className={`truncate rounded border px-1.5 py-0.5 text-left text-xs ${
                        STATUS_COLORS[appointment.status] ?? "bg-slate-100"
                      }`}
                      title={`${formatTime(appointment.startsAt)} ${appointment.patientName ?? ""} — ${appointment.procedure}`}
                    >
                      {formatTime(appointment.startsAt)} {appointment.patientName}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
