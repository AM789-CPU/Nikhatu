"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  Check,
  Heart,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Truck,
  X,
  ZoomIn,
} from "lucide-react";

import ProductMediaGallery from "@/components/product-media-gallery";
import { CartPanel, CheckoutPanel } from "@/components/store-dialogs";
import {
  formatPrice,
  productHasTheme,
  type Product,
  type Theme,
} from "@/lib/products";
import type { CartItem, Customer, PlacedOrder } from "@/lib/store-types";

type ProductPageProps = {
  product: Product;
  relatedProducts: Product[];
};

type MediaTab = "image" | "video" | "360";
type InfoTab = "details" | "materials" | "fit" | "shipping";

const INFO_TABS: { key: InfoTab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "materials", label: "Materials" },
  { key: "fit", label: "Size & Fit" },
  { key: "shipping", label: "Shipping & Returns" },
];

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event("nikhatu:storage-change"));
  } catch {
    /* storage unavailable */
  }
}

function readJsonArray(key: string): unknown[] {
  try {
    const parsed = JSON.parse(readStorage(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ProductPage({
  product,
  relatedProducts,
}: ProductPageProps) {
  /* ---------- media ---------- */

  const images = useMemo(
    () =>
      product.images?.length
        ? [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
        : [
            {
              id: `legacy-${product.id}`,
              productId: product.id,
              url: product.image,
              sortOrder: 0,
              isPrimary: true,
              createdAt: new Date(0),
            },
          ],
    [product],
  );

  const videos = useMemo(
    () =>
      [...(product.media ?? [])]
        .filter((item) => item.type === "video")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [product],
  );

  const spinFrames = useMemo(
    () =>
      [...(product.media ?? [])]
        .filter((item) => item.type === "360")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [product],
  );

  const primaryImage =
    images.find((image) => image.isPrimary)?.url ??
    images[0]?.url ??
    product.image;

  const detailImage = images[1]?.url ?? null;

  /* ---------- state ---------- */

  const [activeImage, setActiveImage] = useState(primaryImage);
  const [mediaTab, setMediaTab] = useState<MediaTab>("image");
  const [zoomOpen, setZoomOpen] = useState(false);

  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);

  const [infoTab, setInfoTab] = useState<InfoTab>("details");
  const [panel, setPanel] = useState<"cart" | "checkout" | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<Theme>("classic");

  const catalog = useMemo(
    () => [product, ...relatedProducts],
    [product, relatedProducts],
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((total, item) => {
        const match = catalog.find((entry) => entry.id === item.productId);
        return total + (match ? match.price * item.quantity : 0);
      }, 0),
    [cart, catalog],
  );

  const bagCount = cart.reduce((total, item) => total + item.quantity, 0);

  /* ---------- effects ---------- */

  // Reset the page state whenever the product changes
  useEffect(() => {
    setActiveImage(primaryImage);
    setMediaTab("image");
    setSize("");
    setQuantity(1);
    setError("");
    setInfoTab("details");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Cart, wishlist, theme, customer
  useEffect(() => {
    const savedCart = readJsonArray("nikhatu-bag");
    setCart(savedCart as CartItem[]);

    setWishlist(readJsonArray("nikhatu-wishlist").includes(product.id));

    const savedTheme: Theme =
      readStorage("nikhatu-theme") === "monster" ? "monster" : "classic";

    const resolvedTheme: Theme = productHasTheme(product, savedTheme)
      ? savedTheme
      : product.themes?.[0] === "monster"
        ? "monster"
        : "classic";

    setTheme(resolvedTheme);
    document.documentElement.dataset.theme = resolvedTheme;

    fetch("/api/auth")
      .then((response) => response.json())
      .then((data) => setCustomer(data.customer ?? null))
      .catch(() => {});
  }, [product]);

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Zoom: Esc to close + lock page scroll
  useEffect(() => {
    if (!zoomOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoomOpen]);

  /* ---------- actions ---------- */

  function syncCart(next: CartItem[]) {
    setCart(next);
    writeStorage("nikhatu-bag", JSON.stringify(next));
  }

  function toggleWishlist() {
    const current = readJsonArray("nikhatu-wishlist").filter(
      (id): id is string => typeof id === "string",
    );

    const next = current.includes(product.id)
      ? current.filter((id) => id !== product.id)
      : [...current, product.id];

    setWishlist(next.includes(product.id));
    writeStorage("nikhatu-wishlist", JSON.stringify(next));
  }

  function addToBag(openCheckout = false) {
    if (!size) {
      setError("Choose a size to make it yours.");
      return;
    }

    setError("");

    const exists = cart.some(
      (item) => item.productId === product.id && item.size === size,
    );

    const next = exists
      ? cart.map((item) =>
          item.productId === product.id && item.size === size
            ? { ...item, quantity: Math.min(10, item.quantity + quantity) }
            : item,
        )
      : [...cart, { productId: product.id, size, quantity }];

    syncCart(next);

    if (openCheckout) {
      setPanel("checkout");
    } else {
      setPanel("cart");
      setToast("A good choice. Added to your bag.");
    }
  }

  function updateQuantity(productId: string, itemSize: string, change: number) {
    syncCart(
      cart
        .map((item) =>
          item.productId === productId && item.size === itemSize
            ? { ...item, quantity: Math.min(10, item.quantity + change) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string, itemSize: string) {
    syncCart(
      cart.filter(
        (item) => !(item.productId === productId && item.size === itemSize),
      ),
    );
  }

  function orderComplete(order: PlacedOrder) {
    syncCart([]);
    writeStorage("nikhatu-last-order", order.orderNumber);
  }

  /* ---------- derived ---------- */

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  const isImageView = mediaTab === "image";

  /* ---------- render ---------- */

  return (
    <div className={`site-shell product-page-shell theme-${theme}`}>
      {/* ===== HEADER ===== */}
      <header className="site-header">
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/shop?category=men">MEN</Link>
          <Link href="/shop?category=women">WOMEN</Link>
          <Link href="/shop?category=kids">KIDS</Link>
          <Link href="/shop?sort=new" className="new-in-nav">
            NEW IN <span />
          </Link>
        </nav>

        <Link className="header-wordmark" href="/" aria-label="NIKHATU home">
          {theme === "monster" ? (
            <img
              className="header-logo"
              src="/images/monster/logo.png"
              alt="NIKHATU"
            />
          ) : (
            <img
              className="header-logo classic"
              src="/images/logo-classic.png"
              alt="NIKHATU"
            />
          )}
        </Link>

        <nav className="header-utilities" aria-label="Shopping tools">
          <button
            type="button"
            onClick={() => setPanel("cart")}
            aria-label={`Shopping bag, ${bagCount} items`}
          >
            <ShoppingBag size={18} strokeWidth={1.4} />
            <span>BAG ({bagCount})</span>
          </button>
        </nav>
      </header>

      <main className="pp-main">
        {/* ===== BREADCRUMBS ===== */}
        <nav className="pp-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/shop">Collection</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        {/* ===== HERO ===== */}
        <section className="pp-hero">
          {/* LEFT — gallery */}
          <div className="pp-gallery">
            <div className="pp-thumbs" aria-label={`${product.name} media`}>
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`pp-thumb ${
                    isImageView && activeImage === image.url ? "is-active" : ""
                  }`}
                  onClick={() => {
                    setActiveImage(image.url);
                    setMediaTab("image");
                  }}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                >
                  <img
                    src={image.url}
                    alt={`${product.name} thumbnail ${index + 1}`}
                  />
                </button>
              ))}

              {videos.length > 0 && (
                <button
                  type="button"
                  className={`pp-thumb ${mediaTab === "video" ? "is-active" : ""}`}
                  onClick={() => setMediaTab("video")}
                  aria-label="View product video"
                >
                  <video
                    src={videos[0].url}
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="pp-thumb-overlay">
                    <span className="pp-thumb-icon">▶</span>
                    <strong>VIDEO</strong>
                  </span>
                </button>
              )}

              {spinFrames.length > 0 && (
                <button
                  type="button"
                  className={`pp-thumb ${mediaTab === "360" ? "is-active" : ""}`}
                  onClick={() => setMediaTab("360")}
                  aria-label="View 360 degree product view"
                >
                  <img
                    src={spinFrames[0].url}
                    alt={`${product.name} 360 preview`}
                  />
                  <span className="pp-thumb-overlay">
                    <span className="pp-thumb-icon">↻</span>
                    <strong>360°</strong>
                  </span>
                </button>
              )}
            </div>

            <div
              className={`pp-stage ${isImageView ? "is-image" : "is-media"}`}
              onClick={isImageView ? () => setZoomOpen(true) : undefined}
            >
              {isImageView && (
                <>
                  <img
                    src={activeImage}
                    alt={`${product.name} in ${product.color}`}
                  />

                  <button
                    type="button"
                    className="pp-zoom"
                    onClick={(event) => {
                      event.stopPropagation();
                      setZoomOpen(true);
                    }}
                    aria-label="Zoom product image"
                  >
                    <ZoomIn size={17} />
                  </button>
                </>
              )}

              {mediaTab === "video" && videos.length > 0 && (
                <video
                  className="pp-stage-video"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  src={videos[0].url}
                />
              )}

              {mediaTab === "360" && spinFrames.length > 0 && (
                <div className="pp-stage-360">
                  <ProductMediaGallery
                    productName={product.name}
                    media={spinFrames}
                    standalone
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — product info */}
          <aside className="pp-info">
            {product.badge && <span className="pp-badge">{product.badge}</span>}

            <h1>{product.name}</h1>

            <div className="pp-rating">
              <span className="pp-stars" aria-hidden="true">
                ★★★★★
              </span>
              <span className="pp-rating-copy">No reviews yet</span>
            </div>

            <div className="pp-price">
              <strong>{formatPrice(product.price)}</strong>
              {product.originalPrice && <del>{formatPrice(product.originalPrice)}</del>}
              {discount > 0 && <span className="pp-discount">{discount}% OFF</span>}
            </div>
            <p className="pp-tax">Inclusive of all taxes</p>

            <p className="pp-description">{product.description}</p>

            <div className="pp-colour">
              <span>Colour:</span>
              <strong>{product.color}</strong>
              <span
                className="pp-swatch"
                style={{ background: product.colorHex }}
                aria-hidden="true"
              />
            </div>

            <div className="pp-size-head">
              <span>
                Size:{" "}
                <strong>{size || "Select"}</strong>
              </span>
              <Link href="/size-guide">Size guide ↗</Link>
            </div>

            <div className="pp-sizes" role="group" aria-label="Select size">
              {product.sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={size === option ? "is-selected" : ""}
                  aria-pressed={size === option}
                  onClick={() => {
                    setSize(option);
                    setError("");
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="pp-buy">
              <div className="pp-qty">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus size={14} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= 10}
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                className="pp-add"
                onClick={() => addToBag(false)}
              >
                <ShoppingBag size={17} />
                ADD TO BAG
              </button>

              <button
                type="button"
                className={`pp-wish ${wishlist ? "is-active" : ""}`}
                onClick={toggleWishlist}
                aria-label={
                  wishlist ? "Remove from wishlist" : "Save to wishlist"
                }
                aria-pressed={wishlist}
              >
                <Heart
                  size={19}
                  strokeWidth={1.4}
                  fill={wishlist ? "currentColor" : "none"}
                />
              </button>
            </div>

            <button
              type="button"
              className="pp-buy-now"
              onClick={() => addToBag(true)}
            >
              BUY NOW
              <ArrowRight size={16} />
            </button>

            <ul className="pp-trust">
              <li>
                <Truck size={17} strokeWidth={1.4} />
                <span>
                  <strong>Free Shipping</strong>
                  <small>On orders ₹1,999+</small>
                </span>
              </li>
              <li>
                <RotateCcw size={17} strokeWidth={1.4} />
                <span>
                  <strong>Easy Returns</strong>
                  <small>15-day return policy</small>
                </span>
              </li>
              <li>
                <ShieldCheck size={17} strokeWidth={1.4} />
                <span>
                  <strong>Secure Payment</strong>
                  <small>100% secure checkout</small>
                </span>
              </li>
            </ul>
          </aside>
        </section>

        {/* ===== DETAILS TABS ===== */}
      <section
  className={`pp-details ${detailImage ? "" : "no-image"}`}
  aria-label="Product information"
>
          <div className="pp-details-copy">
            <div className="pp-tabs" role="tablist">
              {INFO_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={infoTab === tab.key}
                  className={infoTab === tab.key ? "is-active" : ""}
                  onClick={() => setInfoTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pp-tab-panel" role="tabpanel">
              {infoTab === "details" && (
                <>
                  <p>{product.description}</p>
                  <ul className="pp-feature-list">
                    <li>
                      <Shirt size={16} strokeWidth={1.4} />
                      Relaxed, easy-to-wear fit
                    </li>
                    <li>
                      <Layers size={16} strokeWidth={1.4} />
                      Thoughtfully selected fabric
                    </li>
                    <li>
                      <Scissors size={16} strokeWidth={1.4} />
                      Finished with attention to every detail
                    </li>
                    <li>
                      <Ruler size={16} strokeWidth={1.4} />
                      True to size, see the size guide
                    </li>
                  </ul>
                </>
              )}

              {infoTab === "materials" && (
                <p>
                  Machine wash cold with similar colours. Turn inside out and
                  dry in the shade to keep the fabric and colour looking new.
                </p>
              )}

              {infoTab === "fit" && (
                <p>
                  A relaxed, easy-to-wear fit. If you are between sizes, go for
                  the larger one for a looser drape. Check the size guide for
                  exact measurements.
                </p>
              )}

              {infoTab === "shipping" && (
                <p>
                  Free delivery on orders ₹1,999+. Eligible purchases can be
                  returned within 15 days of delivery.
                </p>
              )}
            </div>
          </div>

          {detailImage && (
  <div className="pp-details-image">
    <img src={detailImage} alt={`${product.name} detail`} loading="lazy" />
  </div>
)}
        </section>

        {/* ===== RELATED ===== */}
        {relatedProducts.length > 0 && (
          <section className="pp-related">
            <div className="collection-heading">
              <div>
                <span className="eyebrow">YOU MAY ALSO LIKE</span>
                <h2>
                  More good choices
                  <span className="heading-period">.</span>
                </h2>
              </div>
            </div>

            <div className="pp-related-grid">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  href={`/product/${encodeURIComponent(related.id)}`}
                  className="pp-card"
                >
                  <div className="pp-card-image">
                    <img src={related.image} alt={related.name} loading="lazy" />
                    {related.badge && (
                      <span className="pp-badge pp-badge-float">
                        {related.badge}
                      </span>
                    )}
                  </div>

                  <div className="pp-card-info">
                    <span className="eyebrow muted">
                      {related.department.toUpperCase()}
                    </span>
                    <h3>{related.name}</h3>
                    <strong>{formatPrice(related.price)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ===== PANELS ===== */}
      {panel === "cart" && (
        <CartPanel
          products={catalog}
          items={cart}
          subtotal={subtotal}
          onClose={() => setPanel(null)}
          onQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={() => setPanel("checkout")}
        />
      )}

      {panel === "checkout" && (
        <CheckoutPanel
          products={catalog}
          items={cart}
          subtotal={subtotal}
          customer={customer}
          onClose={() => setPanel(null)}
          onComplete={orderComplete}
          onTrack={() => setPanel(null)}
        />
      )}

      {/* ===== ZOOM ===== */}
      {zoomOpen && (
        <div
          className="pp-zoom-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Product image zoom"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setZoomOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close image zoom"
          >
            <X size={24} />
          </button>
          <img src={activeImage} alt={`${product.name} enlarged`} />
        </div>
      )}

      {/* ===== TOAST ===== */}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}