"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, LoaderCircle, Plus, RefreshCw, Trash2, Video } from "lucide-react";
import type { AdminProductMediaInput } from "@/lib/admin-validation";
import type { ProductMedia } from "@/lib/products";
import styles from "./admin-dashboard.module.css";

const maxVideos = 2;
const maxFrames = 36;
const maxVideoBytes = 100 * 1024 * 1024;
const maxFrameBytes = 5 * 1024 * 1024;
const videoFormats: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
const imageFormats: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type UploadEntry = { key: string; url: string; name: string; size: number; sortOrder: number; status: "uploading" | "ready" | "failed"; progress: number; fingerprint?: string; file?: File; error?: string };
type Props = { initialMedia: ProductMedia[]; onChange: (media: AdminProductMediaInput) => void; onStatusChange: (uploading: boolean, failed: boolean) => void };

function fingerprint(file: File) { return `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`; }

function fromExisting(media: ProductMedia[], type: "video" | "360"): UploadEntry[] {
  return media.filter((item) => item.type === type).sort((a, b) => a.sortOrder - b.sortOrder).map((item, index) => ({
    key: item.id,
    url: item.url,
    name: item.url.split("/").pop() ?? `${type} media ${index + 1}`,
    size: 0,
    sortOrder: index,
    status: "ready",
    progress: 100,
  }));
}

export default function ProductMediaEditor({ initialMedia, onChange, onStatusChange }: Props) {
  const videoInput = useRef<HTMLInputElement>(null);
  const frameInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<{ type: "video" | "360"; key: string } | null>(null);
  const callbackRef = useRef({ onChange, onStatusChange });
  callbackRef.current = { onChange, onStatusChange };
  const [videos, setVideos] = useState(() => fromExisting(initialMedia, "video"));
  const [frames, setFrames] = useState(() => fromExisting(initialMedia, "360"));
  const allRef = useRef({ videos, frames });
  allRef.current = { videos, frames };
  const lastPayload = useRef("");
  const lastStatus = useRef("");
  const [error, setError] = useState("");

  useEffect(() => {
    const payload: AdminProductMediaInput = {
      videos: videos.filter((item) => item.status === "ready").map((item, sortOrder) => ({ url: item.url, sortOrder })),
      spinFrames: frames.filter((item) => item.status === "ready").map((item, sortOrder) => ({ url: item.url, sortOrder })),
    };
    const signature = JSON.stringify(payload);
    if (signature !== lastPayload.current) {
      lastPayload.current = signature;
      callbackRef.current.onChange(payload);
    }
    const status = `${[...videos, ...frames].some((item) => item.status === "uploading")}:${[...videos, ...frames].some((item) => item.status === "failed")}`;
    if (status !== lastStatus.current) {
      lastStatus.current = status;
      const [uploading, failed] = status.split(":").map((value) => value === "true");
      callbackRef.current.onStatusChange(uploading, failed);
    }
  }, [videos, frames]);

  useEffect(() => () => {
    for (const item of [...allRef.current.videos, ...allRef.current.frames]) if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
  }, []);

  function setEntry(type: "video" | "360", key: string, changes: Partial<UploadEntry>) {
    const setter = type === "video" ? setVideos : setFrames;
    setter((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  }

  async function uploadOne(type: "video" | "360", entry: UploadEntry, file: File) {
    const formats = type === "video" ? videoFormats : imageFormats;
    const limit = type === "video" ? maxVideoBytes : maxFrameBytes;
    const extension = formats[file.type];
    if (!extension || file.size < 1 || file.size > limit) {
      setEntry(type, entry.key, { status: "failed", error: !extension ? "Unsupported file type." : `File exceeds ${type === "video" ? "100 MB" : "5 MB"}.` });
      return;
    }
    setEntry(type, entry.key, { name: file.name, size: file.size, file, fingerprint: fingerprint(file), status: "uploading", progress: 0, error: undefined });
    try {
      const folder = type === "video" ? "products/videos" : "products/360";
      const blob = await upload(`${folder}/product-${crypto.randomUUID()}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/uploads",
        contentType: file.type,
        onUploadProgress: ({ percentage }) => setEntry(type, entry.key, { progress: Math.round(percentage) }),
      });
      const setter = type === "video" ? setVideos : setFrames;
      setter((current) => current.map((item) => {
        if (item.key !== entry.key) return item;
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
        return { ...item, url: blob.url, status: "ready", progress: 100, file: undefined, error: undefined };
      }));
    } catch (reason) {
      setEntry(type, entry.key, { status: "failed", error: reason instanceof Error ? reason.message : "Upload failed." });
    }
  }

  async function addFiles(type: "video" | "360", event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = "";
    setError("");
    const current = type === "video" ? videos : frames;
    const max = type === "video" ? maxVideos : maxFrames;
    const formats = type === "video" ? videoFormats : imageFormats;
    const limit = type === "video" ? maxVideoBytes : maxFrameBytes;
    const seen = new Set(current.map((item) => item.file ? fingerprint(item.file) : `${item.name.toLowerCase()}|${item.size}`));
    const valid: File[] = [];
    for (const file of selectedFiles) {
      if (!formats[file.type]) { setError(`${file.name}: unsupported ${type === "video" ? "video" : "frame"} format.`); continue; }
      if (file.size < 1 || file.size > limit) { setError(`${file.name}: file must be no larger than ${type === "video" ? "100 MB" : "5 MB"}.`); continue; }
      const key = fingerprint(file);
      if (seen.has(key) || seen.has(`${file.name.toLowerCase()}|${file.size}`)) { setError(`${file.name}: this file is already added.`); continue; }
      seen.add(key);
      seen.add(`${file.name.toLowerCase()}|${file.size}`);
      valid.push(file);
    }
    const slots = max - current.length;
    if (valid.length > slots) setError(`Maximum ${max} ${type === "video" ? "videos" : "360 frames"}. ${Math.max(0, slots)} slot(s) remain.`);
    const additions = valid.slice(0, Math.max(0, slots));
    if (!additions.length) return;
    const newEntries = additions.map((file, index): UploadEntry => ({
      key: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      sortOrder: current.length + index,
      status: "uploading",
      progress: 0,
      fingerprint: fingerprint(file),
      file,
    }));
    const setter = type === "video" ? setVideos : setFrames;
    setter((items) => [...items, ...newEntries]);
    for (const entry of newEntries) await uploadOne(type, entry, entry.file!);
  }

  function chooseReplacement(type: "video" | "360", key: string) {
    replaceTarget.current = { type, key };
    if (replaceInput.current) replaceInput.current.accept = type === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp";
    replaceInput.current?.click();
  }

  function replaceSelectedFile(file?: File) {
    if (replaceInput.current) replaceInput.current.value = "";
    const target = replaceTarget.current;
    replaceTarget.current = null;
    if (!target || !file) return;
    const list = target.type === "video" ? videos : frames;
    const replacementFingerprint = fingerprint(file);
    if (list.some((item) => item.key !== target.key && (item.fingerprint === replacementFingerprint || (item.file && fingerprint(item.file) === replacementFingerprint)))) {
      setError(`${file.name}: this file is already added.`);
      return;
    }
    const current = list.find((item) => item.key === target.key);
    if (!current) return;
    setError("");
    const replacement = { ...current, name: file.name, size: file.size, file, fingerprint: replacementFingerprint };
    void uploadOne(target.type, replacement, file);
  }

  function remove(type: "video" | "360", key: string) {
    const setter = type === "video" ? setVideos : setFrames;
    if (type === "360") setActiveFrameIndex((current) => Math.min(current, Math.max(0, frames.length - 2)));
    setter((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      return current.filter((item) => item.key !== key).map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  }

  function move(type: "video" | "360", key: string, direction: -1 | 1) {
    const setter = type === "video" ? setVideos : setFrames;
    setter((current) => {
      const index = current.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  }

  const rotationRef = useRef<HTMLDivElement>(null);
  const rotationStart = useRef<{ x: number; index: number } | null>(null);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const activeFrame = frames.length ? Math.min(activeFrameIndex, frames.length - 1) : 0;
  function startRotate(clientX: number) { rotationStart.current = { x: clientX, index: activeFrame }; }
  function moveRotate(clientX: number) {
    if (!rotationStart.current || frames.length < 2) return;
    const delta = clientX - rotationStart.current.x;
    const step = Math.round(delta / Math.max(20, (rotationRef.current?.clientWidth ?? 300) / frames.length));
    setActiveFrameIndex((rotationStart.current.index - step + frames.length * 100) % frames.length);
  }

  return <div className={styles.mediaEditor}>
    <section className={styles.mediaSection}>
      <div className={styles.mediaSectionHeading}><strong>Product videos</strong><small>{videos.length}/{maxVideos} · MP4 or WEBM · 100 MB max each</small></div>
      <input ref={videoInput} className={styles.fileInput} type="file" accept="video/mp4,video/webm" multiple onChange={(event) => void addFiles("video", event)} />
      <input ref={replaceInput} className={styles.fileInput} type="file" onChange={(event) => replaceSelectedFile(event.target.files?.[0])} />
      {videos.length > 0 && <div className={styles.videoMediaGrid}>{videos.map((item, index) => <article className={styles.videoMediaCard} key={item.key}>
        <video controls playsInline preload="metadata" src={item.url} />
        <div className={styles.mediaCardMeta}><span title={item.name}>{item.name}</span>{item.status === "uploading" && <small>{item.progress}% uploading</small>}{item.status === "failed" && <small className={styles.galleryImageError}>{item.error}</small>}</div>
        {item.status === "uploading" && <div className={styles.galleryProgress}><span style={{ width: `${item.progress}%` }} /></div>}
        <div className={styles.mediaCardActions}>{item.status === "failed" && item.file && <button type="button" onClick={() => void uploadOne("video", item, item.file!)} aria-label={`Retry ${item.name}`}><RefreshCw size={14} /></button>}<button type="button" onClick={() => chooseReplacement("video", item.key)} aria-label={`Replace ${item.name}`}><Video size={14} /></button><button type="button" onClick={() => move("video", item.key, -1)} disabled={index === 0} aria-label="Move video earlier"><ArrowUp size={14} /></button><button type="button" onClick={() => move("video", item.key, 1)} disabled={index === videos.length - 1} aria-label="Move video later"><ArrowDown size={14} /></button><button type="button" onClick={() => remove("video", item.key)} aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button></div>
      </article>)}</div>}
      {videos.length < maxVideos && <button className={styles.mediaAddButton} type="button" onClick={() => videoInput.current?.click()}><Plus size={15} /> Add videos</button>}
    </section>
    <section className={styles.mediaSection}>
      <div className={styles.mediaSectionHeading}><strong>360° product view</strong><small>{frames.length}/{maxFrames} frames · JPG, PNG, WEBP · 5 MB max each</small></div>
      <input ref={frameInput} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void addFiles("360", event)} />
      {frames.length > 0 && <>
        <div ref={rotationRef} className={styles.spinPreview} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startRotate(event.clientX); }} onPointerMove={(event) => moveRotate(event.clientX)} onPointerUp={() => { rotationStart.current = null; }} onPointerCancel={() => { rotationStart.current = null; }}>
          {frames[activeFrame]?.status === "ready" ? <img src={frames[activeFrame].url} alt={`360 product view frame ${activeFrame + 1} of ${frames.length}`} /> : <div className={styles.spinPending}>{frames[activeFrame]?.status === "failed" ? frames[activeFrame].error : "Frame uploading…"}</div>}
          <span>{activeFrame + 1} / {frames.length} · Drag to rotate</span>
        </div>
        <div className={styles.spinFrameStrip}>{frames.map((item, index) => <article className={styles.spinFrameCard} key={item.key}>
          <img src={item.url} alt={`360 frame ${index + 1}`} />
          <span>{index + 1}</span>
          {item.status === "uploading" && <small>{item.progress}%</small>}
          {item.status === "failed" && <small className={styles.galleryImageError}>{item.error}</small>}
          <div className={styles.mediaCardActions}>{item.status === "failed" && item.file && <button type="button" onClick={() => void uploadOne("360", item, item.file!)} aria-label={`Retry frame ${index + 1}`}><RefreshCw size={12} /></button>}<button type="button" onClick={() => chooseReplacement("360", item.key)} aria-label={`Replace frame ${index + 1}`}><RefreshCw size={12} /></button><button type="button" onClick={() => move("360", item.key, -1)} disabled={index === 0} aria-label={`Move frame ${index + 1} earlier`}><ArrowUp size={12} /></button><button type="button" onClick={() => move("360", item.key, 1)} disabled={index === frames.length - 1} aria-label={`Move frame ${index + 1} later`}><ArrowDown size={12} /></button><button type="button" onClick={() => remove("360", item.key)} aria-label={`Remove frame ${index + 1}`}><Trash2 size={12} /></button></div>
        </article>)}</div>
      </>}
      {frames.length < maxFrames && <button className={styles.mediaAddButton} type="button" onClick={() => frameInput.current?.click()}><Plus size={15} /> Add 360 frames</button>}
    </section>
    {error && <p className={styles.inlineError} role="alert">{error}</p>}
  </div>;
}
