"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useAuth } from "@/lib/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4201";
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface UploadZoneProps {
  organizationId: string;
  documentType: string;
  kycRequirementKey?: string;
  fundingRequestId?: string;
  onUploaded: () => void;
  compact?: boolean;
}

export function UploadZone({
  organizationId,
  documentType,
  kycRequirementKey,
  fundingRequestId,
  onUploaded,
  compact = false,
}: UploadZoneProps) {
  const { token } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError(null);

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Le fichier dépasse ${MAX_SIZE_MB} Mo.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", documentType);
    formData.append("organizationId", organizationId);
    if (kycRequirementKey) {
      formData.append("kycRequirementKey", kycRequirementKey);
    }
    if (fundingRequestId) {
      formData.append("fundingRequestId", fundingRequestId);
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Échec de l'upload.");
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  if (compact) {
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
          {isUploading ? "Envoi..." : "Uploader"}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center transition ${
          isDragging ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-slate-50"
        }`}
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
          disabled={isUploading}
          className="mt-4 rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Parcourir les fichiers
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
