"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";
import type { ProductMedia } from "@/lib/products";

type ProductMediaGalleryProps = {
  productName: string;
  media: ProductMedia[];
  standalone?: boolean;
};

export default function ProductMediaGallery({
  productName,
  media,
  standalone = false,
}: ProductMediaGalleryProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  const frames = [...media]
    .filter((item) => item.type === "360")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const videos = [...media]
    .filter((item) => item.type === "video")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [activeFrame, setActiveFrame] = useState(0);

  const drag = useRef<{
    x: number;
    frame: number;
  } | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (standalone) return;

    setTarget(
      document.querySelector<HTMLElement>(
        ".product-dialog .product-detail-grid",
      ),
    );
  }, [standalone]);

  useEffect(() => {
    setActiveFrame((frame) =>
      frames.length ? frame % frames.length : 0,
    );
  }, [frames.length]);

  function rotate(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || frames.length < 2) return;

    const width =
      viewerRef.current?.clientWidth ?? 320;

    const step = Math.round(
      (event.clientX - drag.current.x) /
        Math.max(16, width / frames.length),
    );

    setActiveFrame(
      (drag.current.frame -
        step +
        frames.length * 100) %
        frames.length,
    );
  }

  if (!frames.length && !videos.length) {
    return null;
  }

  const content = (
    <section
      className={
        standalone
          ? "product-media-inline standalone-product-media"
          : "product-media-inline"
      }
      aria-label={`${productName} video and 360 media`}
    >
      {/* 360 VIEW */}
      {frames.length > 0 && (
        <div className="product-spin-section">
          <div className="product-media-title">
            <div>
              <span>360° VIEW</span>
              <strong>Explore every angle</strong>
            </div>

            <button
              type="button"
              onClick={() => setActiveFrame(0)}
              aria-label="Reset 360 view"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <div
            ref={viewerRef}
            className="product-spin-viewer"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(
                event.pointerId,
              );

              drag.current = {
                x: event.clientX,
                frame: activeFrame,
              };
            }}
            onPointerMove={rotate}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                setActiveFrame(
                  (frame) =>
                    (frame + 1) % frames.length,
                );
              }

              if (event.key === "ArrowLeft") {
                setActiveFrame(
                  (frame) =>
                    (frame -
                      1 +
                      frames.length) %
                    frames.length,
                );
              }
            }}
            tabIndex={0}
            role="slider"
            aria-label="360 degree product rotation"
            aria-valuemin={1}
            aria-valuemax={frames.length}
            aria-valuenow={activeFrame + 1}
          >
            <img
              src={frames[activeFrame]?.url}
              alt={`${productName}, angle ${
                activeFrame + 1
              } of ${frames.length}`}
              draggable={false}
            />

            <span>
              Drag or swipe to rotate ·{" "}
              {activeFrame + 1}/{frames.length}
            </span>
          </div>
        </div>
      )}

      {/* PRODUCT VIDEO */}
      {videos.length > 0 && (
        <div className="product-video-section">
          <div className="product-media-title">
            <div>
              <span>PRODUCT VIDEO</span>
              <strong>See it in motion</strong>
            </div>
          </div>

          <div className="product-video-grid">
            {videos.map((video) => (
              <video
                key={video.id}
                controls
                playsInline
                preload="metadata"
                src={video.url}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );

  /*
   * Standalone product page:
   * render directly in the product page.
   */
  if (standalone) {
    return content;
  }

  /*
   * Old product-dialog:
   * keep portal behaviour so existing dialog functionality
   * doesn't break.
   */
  if (!target) {
    return null;
  }

  return createPortal(content, target);
}