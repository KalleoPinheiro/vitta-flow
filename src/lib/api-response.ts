import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ConsentRequiredError,
  DomainError,
  InvalidStatusTransitionError,
  NotFoundError,
  SchedulingConflictError,
} from "@/domain/shared/errors";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ success: true, data, error: null }, { status });
}

export function fail(message: string, status: number): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json({ success: false, data: null, error: message }, { status });
}

function statusForDomainError(error: DomainError): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConsentRequiredError) return 403;
  if (error instanceof SchedulingConflictError) return 409;
  if (error instanceof InvalidStatusTransitionError) return 409;
  return 400;
}

export async function handleRequest<T>(
  action: () => Promise<T>,
): Promise<NextResponse<ApiEnvelope<T>>> {
  try {
    return ok(await action());
  } catch (error) {
    if (error instanceof ZodError) {
      const detail = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return fail(`Dados inválidos: ${detail}`, 400);
    }
    if (error instanceof DomainError) {
      return fail(error.message, statusForDomainError(error));
    }
    console.error("Erro inesperado na API:", error);
    return fail("Erro interno do servidor", 500);
  }
}
