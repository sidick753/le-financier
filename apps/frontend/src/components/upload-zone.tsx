"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { alertError } from "@/lib/alert";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4201";
const MAX_SIZE_MB = 50;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface UploadZoneProps {
  organizationId?: string;
  documentType: string;
  kycRequirementKey?: string;
  fundingRequestId?: string;
  onUploaded: (document: { id: string }) => void;
  compact?: boolean;
  requireTitle?: boolean;
  // Certains dépôts (ex. preuve de virement) engagent une action irréversible côté
  // admin — on ne les envoie pas au simple choix du fichier, l'utilisateur doit
  // confirmer explicitement via un bouton "Soumettre".
  deferSubmit?: boolean;
  submitLabel?: string;
}

export function UploadZone({
  organizationId,
  documentType,
  kycRequirementKey,
  fundingRequestId,
  onUploaded,
  compact = false,
  requireTitle = false,
  deferSubmit = false,
  submitLabel = "Soumettre",
}: UploadZoneProps) {
  const { token } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const titleMissing = requireTitle && !title.trim();

  async function uploadFile(file: File) {
    if (titleMissing) {
      alertError("Veuillez indiquer un titre pour ce document.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alertError(`Le fichier dépasse ${MAX_SIZE_MB} Mo.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      alertError("Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", documentType);
    if (organizationId) {
      formData.append("organizationId", organizationId);
    }
    if (kycRequirementKey) {
      formData.append("kycRequirementKey", kycRequirementKey);
    }
    if (fundingRequestId) {
      formData.append("fundingRequestId", fundingRequestId);
    }
    if (requireTitle) {
      formData.append("title", title.trim());
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Échec de l'upload.");
      }
      onUploaded(data);
      setTitle("");
      setStagedFile(null);
    } catch (err) {
      alertError(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setIsUploading(false);
    }
  }

  function stageOrUpload(file: File) {
    if (deferSubmit) {
      setStagedFile(file);
    } else {
      uploadFile(file);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (titleMissing) {
      alertError("Veuillez indiquer un titre avant d'ajouter un fichier.");
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) stageOrUpload(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) stageOrUpload(file);
    e.target.value = "";
  }

  if (compact) {
    if (deferSubmit && stagedFile) {
      return (
        <div className="flex items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate">{stagedFile.name}</span>
          </span>
          <button
            onClick={() => uploadFile(stagedFile)}
            disabled={isUploading}
            className="shrink-0 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {isUploading ? "Envoi..." : submitLabel}
          </button>
          <button
            onClick={() => setStagedFile(null)}
            disabled={isUploading}
            className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      );
    }
    return (
      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {isUploading ? "Envoi..." : deferSubmit ? "Choisir un fichier" : "Uploader"}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div>
      {requireTitle && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Titre du document
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Bilan comptable 2025"
            className="h-[42px] w-full rounded-[10px] border border-slate-200 px-3.5 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      )}
      {deferSubmit && stagedFile ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-slate-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate">{stagedFile.name}</span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setStagedFile(null)}
              disabled={isUploading}
              className="text-[13px] font-medium text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={() => uploadFile(stagedFile)}
              disabled={isUploading}
              className="rounded-lg bg-blue-700 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {isUploading ? "Envoi..." : submitLabel}
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center transition ${
            titleMissing ? "opacity-50" : ""
          } ${isDragging ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDragging ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="mt-3 text-[13px] font-semibold text-slate-900">
            {isUploading ? "Envoi en cours..." : "Glissez-déposez vos fichiers ici"}
          </p>
          <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG, WEBP — max {MAX_SIZE_MB} Mo</p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || titleMissing}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Parcourir les fichiers
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      )}
    </div>
  );
}
