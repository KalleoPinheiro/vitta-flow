"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@still-void/ui/react/client";
import { apiFetch } from "@/lib/client";
import type { ConditionPhotoDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { ErrorAlert } from "@/components/feedback";
import { ConfirmAction } from "@/components/confirm-action";
import { Button, FileInput } from "@still-void/ui/react";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface ConditionPhotosProps {
  conditionId: string;
  canUpload: boolean;
}

/** Galeria de fotos de evolução da condição: upload, comparação primeira × última, exclusão. */
export function ConditionPhotos({ conditionId, canUpload }: ConditionPhotosProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<ConditionPhotoDto[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ConditionPhotoDto[]>(`/api/conditions/${conditionId}/photos`)
      .then((result) => {
        if (!cancelled) {
          setPhotos(result);
          setListError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Erro ao carregar fotos");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [conditionId, version]);

  const load = useCallback(() => setVersion((current) => current + 1), []);

  const upload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setActionError("Imagem excede o limite de 5 MB");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/conditions/${conditionId}/photos`, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Erro ao enviar foto");
      }
      toast({ description: "Foto enviada", variant: "success" });
      setActionError(null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (photo: ConditionPhotoDto) => {
    try {
      await apiFetch(`/api/photos/${photo.id}`, { method: "DELETE" });
      toast({ description: "Foto excluída", variant: "success" });
      setActionError(null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao excluir foto");
    }
  };

  const list = photos ?? [];
  const chronological = [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const first = chronological[0];
  const last = chronological[chronological.length - 1];
  const showCompare = chronological.length >= 2 && first.id !== last.id;

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase text-ink-3">Fotos de evolução</h4>
        {canUpload && (
          <FileInput
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        )}
      </div>

      {listError && <ErrorAlert message={listError} onRetry={load} />}
      {actionError && <ErrorAlert message={actionError} />}

      {photos === null ? (
        listError ? null : (
          <p className="text-xs text-ink-3">Carregando fotos…</p>
        )
      ) : list.length === 0 ? (
        <p className="text-xs text-ink-3">Nenhuma foto registrada.</p>
      ) : (
        <>
          {showCompare && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <ComparePane label={`Primeira — ${formatDate(first.createdAt)}`} photoId={first.id} />
              <ComparePane label={`Atual — ${formatDate(last.createdAt)}`} photoId={last.id} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {chronological.map((photo) => (
              <figure key={photo.id} className="w-24">
                {/* eslint-disable-next-line @next/next/no-img-element -- rota autorizada dinâmica */}
                <img
                  src={`/api/photos/${photo.id}`}
                  alt={`Foto de ${formatDate(photo.createdAt)}`}
                  className="h-24 w-24 rounded border border-border object-cover"
                />
                <figcaption className="mt-0.5 flex items-center justify-between text-[10px] text-ink-3">
                  {formatDate(photo.createdAt)}
                  {canUpload && (
                    <ConfirmAction
                      trigger={
                        <Button type="button" variant="link" className="h-auto p-0 text-danger">
                          excluir
                        </Button>
                      }
                      title="Excluir esta foto?"
                      description="A evidência clínica é removida permanentemente."
                      confirmLabel="Excluir"
                      variant="danger"
                      onConfirm={() => remove(photo)}
                    />
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ComparePane({ label, photoId }: { label: string; photoId: string }) {
  return (
    <figure>
      <figcaption className="mb-1 text-xs font-medium text-ink-3">{label}</figcaption>
      {/* eslint-disable-next-line @next/next/no-img-element -- rota autorizada dinâmica */}
      <img
        src={`/api/photos/${photoId}`}
        alt={label}
        className="w-full rounded border border-border object-contain"
      />
    </figure>
  );
}
