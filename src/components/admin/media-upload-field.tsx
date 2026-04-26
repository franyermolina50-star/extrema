"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useRef,
  useState
} from "react";

import styles from "./admin.module.css";

interface MediaUploadFieldProps {
  label: string;
  helperText: string;
  previewAlt: string;
  previewKind: "image" | "video";
  previewUrl: string;
  accept: string;
  compact?: boolean;
  uploading?: boolean;
  onUpload: (file: File) => Promise<void>;
}

export function MediaUploadField({
  label,
  helperText,
  previewAlt,
  previewKind,
  previewUrl,
  accept,
  compact = false,
  uploading = false,
  onUpload
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) {
      return;
    }

    try {
      await onUpload(file);
    } catch {
      // The parent component is responsible for surfacing the error.
    } finally {
      resetInput();
    }
  };

  const triggerPicker = () => {
    if (!uploading) {
      inputRef.current?.click();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerPicker();
    }
  };

  return (
    <div className={compact ? styles.mediaUploadCompact : styles.mediaUploadField}>
      <div className={styles.mediaUploadHeader}>
        <div>
          <h3>{label}</h3>
          <p>{uploading ? "Subiendo archivo..." : helperText}</p>
        </div>
        <span className={styles.mediaUploadBadge}>
          {uploading ? "Subiendo" : previewUrl ? "Listo" : "Pendiente"}
        </span>
      </div>

      <div
        className={
          isDragging
            ? `${styles.mediaDropZone} ${styles.mediaDropZoneActive}`
            : styles.mediaDropZone
        }
        onClick={triggerPicker}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) {
            setIsDragging(true);
          }
        }}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {previewUrl ? (
          previewKind === "image" ? (
            <img alt={previewAlt} className={styles.mediaPreviewImage} src={previewUrl} />
          ) : (
            <video
              className={styles.mediaPreviewVideo}
              controls
              onClick={(event) => event.stopPropagation()}
              preload="metadata"
              src={previewUrl}
            />
          )
        ) : (
          <div className={styles.mediaDropPlaceholder}>
            <strong>Arrastra el archivo aquí o haz clic para elegirlo</strong>
            <span>Soporta archivos locales desde tu computador.</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        accept={accept}
        className={styles.visuallyHidden}
        disabled={uploading}
        onChange={handleChange}
        type="file"
      />
    </div>
  );
}
