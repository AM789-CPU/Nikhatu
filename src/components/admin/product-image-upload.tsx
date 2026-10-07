"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { upload } from "@vercel/blob/client";
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import styles from "./admin-dashboard.module.css";

const maxBytes = 5 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default function ProductImageUpload({ value, onChange, onUploadingChange }: { value: string; onChange: (url: string) => void; onUploadingChange: (uploading: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPreview(value);
  }, [value]);

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  async function selectFile(file?: File) {
    if (!file) return;
    setError("");
    const extension = extensions[file.type];
    if (!extension) {
      setError("Choose a PNG, JPG, or WEBP image.");
      return;
    }
    if (file.size > maxBytes) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setFileDetails({ name: file.name, size: file.size });
    setProgress(0);
    setUploading(true);
    onUploadingChange(true);
    try {
      const blob = await upload(`products/product-${crypto.randomUUID()}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/uploads",
        contentType: file.type,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      onChange(blob.url);
      setPreview(blob.url);
    } catch (reason) {
      setPreview(value);
      setFileDetails(null);
      setError(reason instanceof Error ? reason.message : "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void selectFile(event.dataTransfer.files[0]);
  }

  function activateDropzone(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  function removeImage() {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview("");
    setFileDetails(null);
    setError("");
    onChange("");
  }

  return <div className={styles.imageUpload}>
    <input ref={inputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectFile(event.target.files?.[0])} />
    {preview ? <div className={styles.imagePreview}>
      <img src={preview} alt="Product image preview" />
      <div className={styles.imageInfo}>
        <strong>{fileDetails?.name || "Current product image"}</strong>
        <span>{fileDetails ? `${(fileDetails.size / 1024 / 1024).toFixed(2)} MB` : "Stored image"}</span>
        {uploading && <div className={styles.progressTrack} aria-label={`Uploading ${progress}%`}><span style={{ width: `${progress}%` }} /></div>}
      </div>
      <div className={styles.imageActions}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}><RefreshCw size={15} /> Replace image</button>
        <button type="button" onClick={removeImage} disabled={uploading}><Trash2 size={15} /> Remove image</button>
      </div>
    </div> : <div
      className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={activateDropzone}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={dropFile}
    >
      <span className={styles.uploadSymbol}><UploadCloud size={24} /></span>
      <strong><ImagePlus size={16} /> Upload image</strong>
      <span>Drag and drop, or choose a file</span>
      <small>PNG, JPG, WEBP up to 5 MB · One image</small>
    </div>}
    {uploading && <p className={styles.uploadingNote}>Uploading image... {progress}%</p>}
    {error && <p className={styles.inlineError} role="alert">{error}</p>}
  </div>;
}