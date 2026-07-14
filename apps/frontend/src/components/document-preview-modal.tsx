"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Props {
  documentId: string;
  onClose: () => void;
}

interface DownloadUrlResponse {
  url: string;
  fileName: string;
  mimeType: string;
}

export function DocumentPreviewModal({ documentId, onClose }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<DownloadUrlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setData(null);
    setError(null);
    api
      .get<DownloadUrlResponse>(`/documents/${documentId}/download-url`, token)
      .then(setData)
      .catch(() => setError("Impossible de charger ce document."));
  }, [documentId, token]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <p className="truncate text-sm font-semibold text-gray-900">
            {data?.fileName ?? "Document"}
          </p>
          <div className="flex items-center gap-4">
            {data && (
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Ouvrir dans un nouvel onglet
              </a>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!error && !data && <p className="text-sm text-gray-400">Chargement...</p>}
          {data && data.mimeType.startsWith("image/") && (
            <img
              src={data.url}
              alt={data.fileName}
              className="mx-auto max-h-[70vh] rounded-lg"
            />
          )}
          {data && data.mimeType === "application/pdf" && (
            <iframe
              src={data.url}
              className="h-[70vh] w-full rounded-lg border border-gray-200"
              title={data.fileName}
            />
          )}
          {data && !data.mimeType.startsWith("image/") && data.mimeType !== "application/pdf" && (
            <p className="text-sm text-gray-500">
              Aperçu non disponible pour ce type de fichier.{" "}
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-700 hover:underline"
              >
                Télécharger
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
