"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, RefreshCw, Star, Trash2, UploadCloud } from "lucide-react";
import type { AdminProductImageInput } from "@/lib/admin-validation";
import styles from "./admin-dashboard.module.css";

const maxBytes = 5 * 1024 * 1024;
const maxImages = 8;
const extensions: Record<string, { extension: string; contentType: string }> = {
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
  "image/png": { extension: "png", contentType: "image/png" },
  "image/webp": { extension: "webp", contentType: "image/webp" },
};

type Entry = AdminProductImageInput & {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "ready" | "failed";
  progress: number;
  fingerprint?: string;
  file?: File;
  error?: string;
};

type ExistingImage = AdminProductImageInput & { id?: string };

type Props = {
  initialImages: ExistingImage[];
  onChange: (images: AdminProductImageInput[]) => void;
  onStatusChange: (uploading: boolean, failed: boolean) => void;
};

function fileFingerprint(file: File) {
  return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`;
}

export default function ProductImageGalleryEditor({ initialImages, onChange, onStatusChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragKey = useRef<string | null>(null);
  const callbackRef = useRef({ onChange, onStatusChange });
  const lastImageSignature = useRef("");
  const lastStatusSignature = useRef("");
  callbackRef.current = { onChange, onStatusChange };
  const [entries, setEntries] = useState<Entry[]>(() => initialImages.map((image, index) => ({
    ...image,
    key: image.id ?? `existing-${index}-${image.url}`,
    name: image.url.split("/").pop() ?? "Product image",
    size: 0,
    status: "ready",
    progress: 100,
  })));
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ready = entries.filter((entry) => entry.status === "ready");
    const primaryIndex = ready.findIndex((entry) => entry.isPrimary);
    const images = ready.map((entry, index) => ({ url: entry.url, sortOrder: index, isPrimary: index === (primaryIndex < 0 ? 0 : primaryIndex) }));
    const imageSignature = JSON.stringify(images);
    if (imageSignature !== lastImageSignature.current) {
      lastImageSignature.current = imageSignature;
      callbackRef.current.onChange(images);
    }
    const statusSignature = `${entries.some((entry) => entry.status === "uploading")}:${entries.some((entry) => entry.status === "failed")}`;
    if (statusSignature !== lastStatusSignature.current) {
      lastStatusSignature.current = statusSignature;
      const [uploading, failed] = statusSignature.split(":").map((value) => value === "true");
      callbackRef.current.onStatusChange(uploading, failed);
    }
  }, [entries]);

  useEffect(() => () => {
    for (const entry of entriesRef.current) if (entry.url.startsWith("blob:")) URL.revokeObjectURL(entry.url);
  }, []);

  function updateEntry(key: string, update: Partial<Entry>) {
    setEntries((current) => current.map((entry) => entry.key === key ? { ...entry, ...update } : entry));
  }

  async function uploadEntry(entry: Entry, file: File) {
    const format = extensions[file.type];
    if (!format || file.size < 1 || file.size > maxBytes) {
      updateEntry(entry.key, { status: "failed", error: !format ? "Unsupported image type." : "Image must be under 5 MB." });
      return;
    }
    updateEntry(entry.key, { status: "uploading", progress: 0, error: undefined });
    try {
      const blob = await upload(`products/product-${crypto.randomUUID()}.${format.extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/uploads",
        contentType: format.contentType,
        onUploadProgress: ({ percentage }) => updateEntry(entry.key, { progress: Math.round(percentage) }),
      });
      setEntries((current) => current.map((item) => {
        if (item.key !== entry.key) return item;
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
        return { ...item, url: blob.url, status: "ready", progress: 100, file: undefined, error: undefined };
      }));
    } catch (reason) {
      updateEntry(entry.key, { status: "failed", error: reason instanceof Error ? reason.message : "Upload failed." });
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    setError("");
    const candidates = Array.from(fileList);
    const known = new Set(entries.flatMap((entry) => [entry.fingerprint, `${entry.name.toLowerCase()}|${entry.size}`]).filter((value): value is string => !!value));
    const accepted: File[] = [];
    for (const file of candidates) {
      if (!extensions[file.type]) {
        setError(`${file.name}: choose a JPG, PNG, or WEBP image.`);
        continue;
      }
      if (file.size < 1 || file.size > maxBytes) {
        setError(`${file.name}: image must be greater than 0 bytes and no larger than 5 MB.`);
        continue;
      }
      const fingerprint = fileFingerprint(file);
      if (known.has(fingerprint) || known.has(`${file.name.toLowerCase()}|${file.size}`)) {
        setError(`${file.name}: this file is already in the product images.`);
        continue;
      }
      known.add(fingerprint);
      known.add(`${file.name.toLowerCase()}|${file.size}`);
      accepted.push(file);
    }
    const slots = maxImages - entries.length;
    if (accepted.length > slots) setError(`A product can have at most ${maxImages} images. ${Math.max(slots, 0)} slot(s) remain.`);
    const selected = accepted.slice(0, Math.max(slots, 0));
    if (!selected.length) return;
    const newEntries: Entry[] = selected.map((file, index) => ({
      key: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      status: "uploading",
      progress: 0,
      fingerprint: fileFingerprint(file),
      sortOrder: entries.length + index,
      isPrimary: entries.length === 0 && index === 0,
      file,
    }));
    setEntries((current) => [...current, ...newEntries]);
    if (inputRef.current) inputRef.current.value = "";
    await Promise.all(newEntries.map((entry) => uploadEntry(entry, entry.file!)));
  }

  function makePrimary(key: string) {
    setEntries((current) => current.map((entry, index) => ({ ...entry, isPrimary: entry.key === key, sortOrder: index })));
  }

  function removeEntry(key: string) {
    setEntries((current) => {
      const removed = current.find((entry) => entry.key === key);
      if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      const remaining = current.filter((entry) => entry.key !== key).map((entry, index) => ({ ...entry, sortOrder: index }));
      if (remaining.length && !remaining.some((entry) => entry.isPrimary)) remaining[0] = { ...remaining[0], isPrimary: true };
      return remaining;
    });
  }

  function moveEntry(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey) return;
    setEntries((current) => {
      const sourceIndex = current.findIndex((entry) => entry.key === sourceKey);
      const targetIndex = current.findIndex((entry) => entry.key === targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered.map((entry, index) => ({ ...entry, sortOrder: index }));
    });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const source = dragKey.current;
    dragKey.current = null;
    if (source) moveEntry(source, event.currentTarget.dataset.key ?? "");
    else if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return <div className={styles.imageGalleryEditor}>
    <input ref={inputRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { if (event.target.files) void addFiles(event.target.files); }} />
    <div className={styles.imageGalleryGrid}>
      {entries.map((entry, index) => <div key={entry.key} className={`${styles.galleryImageCard} ${entry.isPrimary ? styles.galleryImagePrimary : ""}`} draggable onDragStart={() => { dragKey.current = entry.key; }} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} data-key={entry.key}>
        <img src={entry.url} alt={`Product image ${index + 1}`} />
        <div className={styles.galleryImageOverlay}>
          <span className={styles.galleryImageName}>{entry.name}</span>
          <span>{entry.isPrimary ? "Primary" : `Image ${index + 1}`}</span>
          {entry.status === "uploading" && <span>{entry.progress}%</span>}
          {entry.status === "failed" && <span className={styles.galleryImageError}>{entry.error}</span>}
        </div>
        {entry.status === "uploading" && <div className={styles.galleryProgress}><span style={{ width: `${entry.progress}%` }} /></div>}
        <div className={styles.galleryImageActions}>
          {entry.status === "failed" && entry.file && <button type="button" onClick={() => void uploadEntry(entry, entry.file!)} aria-label={`Retry upload for ${entry.name}`}><RefreshCw size={14} /></button>}
          <button type="button" onClick={() => makePrimary(entry.key)} disabled={entry.status !== "ready"} aria-pressed={entry.isPrimary} aria-label={`Set ${entry.name} as primary`} title="Set as primary"><Star size={14} fill={entry.isPrimary ? "currentColor" : "none"} /></button>
          <button type="button" onClick={() => moveEntry(entry.key, entries[index - 1]?.key ?? entry.key)} disabled={index === 0} aria-label={`Move ${entry.name} earlier`}><ArrowUp size={14} /></button>
          <button type="button" onClick={() => moveEntry(entry.key, entries[index + 1]?.key ?? entry.key)} disabled={index === entries.length - 1} aria-label={`Move ${entry.name} later`}><ArrowDown size={14} /></button>
          <button type="button" onClick={() => removeEntry(entry.key)} aria-label={`Remove ${entry.name}`}><Trash2 size={14} /></button>
        </div>
        {entry.status === "uploading" && <LoaderCircle className={styles.gallerySpinner} size={17} />}
      </div>)}
      {entries.length < maxImages && <div className={`${styles.galleryDropZone} ${dragging ? styles.dropZoneActive : ""}`} role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={onKeyDown} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <UploadCloud size={23} /><strong>Add images</strong><small>JPG, PNG, WEBP · 5 MB each</small><small>{entries.length}/{maxImages} images</small>
      </div>}
    </div>
    {error && <p className={styles.inlineError} role="alert">{error}</p>}
  </div>;
}
