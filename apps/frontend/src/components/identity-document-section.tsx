"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { UploadZone } from "@/components/upload-zone";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { DOCUMENT_STATUS_CONFIG, formatFileSize } from "@/lib/document-labels";

interface PersonalDocument {
  id: string;
  type: string;
  fileName: string;
  sizeBytes: number;
  status: string;
  rejectionReason: string | null;
}

// Pièce d'identité rattachée directement à l'utilisateur (pas d'organisation) —
// utilisée par les investisseurs particuliers pour compléter leur dossier KYC.
export function IdentityDocumentSection() {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token || !user) return;
    setIsLoading(true);
    api
      .get<PersonalDocument[]>(`/documents/user/${user.id}`, token)
      .then(setDocuments)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const idDoc = documents.find((d) => d.type === "KYC_ID") ?? null;
  const statusConfig = idDoc ? DOCUMENT_STATUS_CONFIG[idDoc.status] : null;

  return (
    <div className="mt-6 max-w-2xl rounded-xl border border-gray-200 bg-white p-6">
      <p className="mb-1 text-lg font-bold text-gray-900">Pièce d&apos;identité (KYC)</p>
      <p className="mb-4 text-xs text-gray-500">
        Une copie de votre CNI (ou pièce d&apos;identité équivalente), nécessaire à la vérification de
        votre compte investisseur.
      </p>

      {isLoading && <p className="text-sm text-gray-400">Chargement...</p>}

      {!isLoading && idDoc && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{idDoc.fileName}</p>
            <p className="text-xs text-gray-400">{formatFileSize(idDoc.sizeBytes)}</p>
            {idDoc.status === "REJECTED" && idDoc.rejectionReason && (
              <p className="mt-1 text-xs text-red-600">Motif : {idDoc.rejectionReason}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {statusConfig && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusConfig.badgeClass}`}>
                {statusConfig.label}
              </span>
            )}
            <button
              onClick={() => setPreviewDocId(idDoc.id)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Voir
            </button>
          </div>
        </div>
      )}

      {!isLoading && (!idDoc || idDoc.status === "REJECTED") && (
        <UploadZone documentType="KYC_ID" onUploaded={refresh} />
      )}

      {previewDocId && (
        <DocumentPreviewModal documentId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}
