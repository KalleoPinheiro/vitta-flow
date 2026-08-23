"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { ConditionPhotoDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { ErrorAlert } from "@/components/feedback";
import { Button } from "@still-void/ui/react";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface ConditionPhotosProps {
  conditionId: string;
  canUpload: boolean;
}

/** Galeria de fotos de evolução da condição: upload, comparação primeira × última, exclusão. */
export function ConditionPhotos({ conditionId, canUpload }: ConditionPhotosProps) {
  const [photos, setPhotos] = useState<ConditionPhotoDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ConditionPhotoDto[]>(`/api/conditions/${conditionId}/photos`)
      .then((result) => {
        if (!cancelled) {
          setPhotos(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar fotos");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [conditionId, version]);

  const load = useCallback(() => setVersion((current) => current + 1), []);

  const upload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Imagem excede o limite de 5 MB");
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
      setError(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (photo: ConditionPhotoDto) => {
    try {
      await apiFetch(`/api/photos/${photo.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir foto");
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
          <label className="cursor-pointer text-xs font-medium text-accent-ink hover:underline">
            {uploading ? "Enviando…" : "+ Adicionar foto"}
            {/* sv-gap: file-input */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {list.length === 0 ? (
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
            {list.map((photo) => (
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
                    <Button
                      type="button"
                      onClick={() => void remove(photo)}
                      variant="link"
                      className="h-auto p-0 text-danger"
                    >
                      excluir
                    </Button>
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
