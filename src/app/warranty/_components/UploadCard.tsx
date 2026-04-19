"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(file: File): "image" | "video" | "pdf" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "file";
}

export function UploadCard({
  id,
  name,
  label,
  accept,
  required,
  value,
  onChange,
  maxSizeMB,
}: {
  id: string;
  name?: string;
  label: string;
  accept?: string;
  required?: boolean;
  value: File | null;
  onChange: (f: File | null) => void;
  maxSizeMB?: number;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    if (value.type.startsWith("image/")) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [value]);

  const accept_ = accept ?? "*/*";

  const handle = (file: File | null) => {
    setError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB} MB limit`);
      return;
    }
    onChange(file);
  };

  const kind = value ? fileKind(value) : "file";

  return (
    <div
      className={`upc ${value ? "is-filled" : ""} ${drag ? "is-drag" : ""} ${
        error ? "has-error" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0] ?? null;
        handle(f);
      }}
    >
      <input
        ref={inputRef}
        id={id}
        name={name ?? id}
        type="file"
        accept={accept_}
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />

      {!value ? (
        <button
          type="button"
          className="upc-empty"
          onClick={() => inputRef.current?.click()}
        >
          <span className="upc-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 16V5M7 10l5-5 5 5M5 19h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="upc-text">
            <span className="upc-label">
              {label}
              {required && <span className="req">*</span>}
            </span>
            <span className="upc-hint">
              Click or drop file{maxSizeMB ? ` · max ${maxSizeMB} MB` : ""}
            </span>
          </span>
        </button>
      ) : (
        <div className="upc-filled">
          <div className="upc-thumb">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : (
              <span className="upc-kind" aria-hidden>
                {kind === "video" ? (
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="6"
                      width="14"
                      height="12"
                      rx="1"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M17 10l4-2v8l-4-2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : kind === "pdf" ? (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3h8l4 4v14H7z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 3v5h5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3h8l4 4v14H7z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            )}
          </div>
          <div className="upc-meta">
            <p className="upc-label upc-label--truncate" title={label}>
              {label}
              {required && <span className="req">*</span>}
            </p>
            <p className="upc-filename" title={value.name}>
              {value.name}
            </p>
            <p className="upc-size">{formatSize(value.size)}</p>
          </div>
          <div className="upc-actions">
            {preview && (
              <button
                type="button"
                className="upc-preview-btn"
                aria-label="Preview image"
                onClick={() => setModalOpen(true)}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <ellipse cx="10" cy="10" rx="7.5" ry="5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="upc-remove"
              aria-label="Remove file"
              onClick={() => handle(null)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {modalOpen && preview && createPortal(
        <div className="upc-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="upc-modal" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={value?.name ?? ""} />
            <button
              type="button"
              className="upc-modal-close"
              aria-label="Close preview"
              onClick={() => setModalOpen(false)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}

      {error && <p className="upc-error">{error}</p>}
    </div>
  );
}
