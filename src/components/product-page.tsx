"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
} from "lucide-react";

import ProductMediaGallery from "@/components/product-media-gallery";

import {
  CartPanel,
  CheckoutPanel,
} from "@/components/store-dialogs";

import {
  formatPrice,
  productHasTheme,
  type Product,
  type Theme,
} from "@/lib/products";

import type {
  CartItem,
  Customer,
  PlacedOrder,
} from "@/lib/store-types";

type ProductPageProps = {
  product: Product;
  relatedProducts: Product[];
};

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
    window.dispatchEvent(
      new Event("nikhatu:storage-change"),
    );
  } catch {}
}

export default function ProductPage({
  product,
  relatedProducts,
}: ProductPageProps) {
  const images =
    product.images?.length
      ? [...product.images].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        )
      : [
          {
            id: `legacy-${product.id}`,
            productId: product.id,
            url: product.image,
            sortOrder: 0,
            isPrimary: true,
            createdAt: new Date(0),
          },
        ];

  const [activeImage, setActiveImage] = useState(
    product.image,
  );

  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [wishlist, setWishlist] = useState(false);
  const [panel, setPanel] = useState<
    "cart" | "checkout" | null
  >(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [theme, setTheme] =
    useState<Theme>("classic");

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          (item.productId === product.id
            ? product.price
            : 0) *
            item.quantity,
        0,
      ),
    [cart, product.id, product.price],
  );

  useEffect(() => {
    try {
      const savedCart = JSON.parse(
        readStorage("nikhatu-bag") || "[]",
      );

      if (Array.isArray(savedCart)) {
        setCart(savedCart);
      }

      const savedWishlist = JSON.parse(
        readStorage("nikhatu-wishlist") || "[]",
      );

      setWishlist(
        Array.isArray(savedWishlist) &&
          savedWishlist.includes(product.id),
      );

      const savedTheme =
        readStorage("nikhatu-theme") === "monster"
          ? "monster"
          : "classic";

      const resolvedTheme =
        productHasTheme(product, savedTheme)
          ? savedTheme
          : product.themes?.[0] === "monster"
            ? "monster"
            : "classic";

      setTheme(resolvedTheme);

      document.documentElement.dataset.theme =
        resolvedTheme;
    } catch {}

    fetch("/api/auth")
      .then((response) => response.json())
      .then((data) =>
        setCustomer(data.customer ?? null),
      )
      .catch(() => {});
  }, [product]);

  function syncCart(next: CartItem[]) {
    setCart(next);
    writeStorage("nikhatu-bag", JSON.stringify(next));
  }

  function toggleWishlist() {
    let next: string[];

    try {
      const saved = JSON.parse(
        readStorage("nikhatu-wishlist") || "[]",
      );

      const current = Array.isArray(saved)
        ? saved.filter(
            (id): id is string =>
              typeof id === "string",
          )
        : [];

      next = current.includes(product.id)
        ? current.filter((id) => id !== product.id)
        : [...current, product.id];

      setWishlist(next.includes(product.id));
      writeStorage(
        "nikhatu-wishlist",
        JSON.stringify(next),
      );
    } catch {}
  }

  function addToBag(openCheckout = false) {
    if (!size) {
      setError("Choose a size to make it yours.");
      return;
    }

    setError("");

    const existing = cart.find(
      (item) =>
        item.productId === product.id &&
        item.size === size,
    );

    const next = existing
      ? cart.map((item) =>
          item.productId === product.id &&
          item.size === size
            ? {
                ...item,
                quantity: Math.min(
                  10,
                  item.quantity + quantity,
                ),
              }
            : item,
        )
      : [
          ...cart,
          {
            productId: product.id,
            size,
            quantity,
          },
        ];

    syncCart(next);

    if (openCheckout) {
      setPanel("checkout");
    } else {
      setPanel("cart");
      setToast("A good choice. Added to your bag.");
    }
  }

  function updateQuantity(
    productId: string,
    itemSize: string,
    change: number,
  ) {
    const next = cart
      .map((item) =>
        item.productId === productId &&
        item.size === itemSize
          ? {
              ...item,
              quantity: Math.min(
                10,
                item.quantity + change,
              ),
            }
          : item,
      )
      .filter((item) => item.quantity > 0);

    syncCart(next);
  }

  function removeFromCart(
    productId: string,
    itemSize: string,
  ) {
    syncCart(
      cart.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.size === itemSize
          ),
      ),
    );
  }

  function orderComplete(order: PlacedOrder) {
    syncCart([]);
    writeStorage(
      "nikhatu-last-order",
      order.orderNumber,
    );
  }

  return (
    <div className="site-shell product-page-shell">
      <header className="site-header">
        <nav
          className="desktop-nav"
          aria-label="Main navigation"
        >
          <Link href="/shop?category=men">
            MEN
          </Link>

          <Link href="/shop?category=women">
            WOMEN
          </Link>

          <Link href="/shop?category=kids">
            KIDS
          </Link>

          <Link
            href="/shop?sort=new"
            className="new-in-nav"
          >
            NEW IN <span />
          </Link>
        </nav>

        <Link
          className="header-wordmark"
          href="/"
          aria-label="NIKHATU home"
        >
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

        <nav
          className="header-utilities"
          aria-label="Shopping tools"
        >
          <button
            onClick={() => setPanel("cart")}
            aria-label="Shopping bag"
          >
            <ShoppingBag
              size={18}
              strokeWidth={1.4}
            />
            <span>
              BAG (
              {cart.reduce(
                (total, item) =>
                  total + item.quantity,
                0,
              )}
              )
            </span>
          </button>
        </nav>
      </header>

      <main className="standalone-product">
        <div className="product-page-breadcrumbs">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">
            Collection
          </Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        <section className="product-detail-grid standalone-product-grid">
          <div className="standalone-product-visuals">
            <div className="detail-photo standalone-detail-photo">
              <img
                src={activeImage}
                alt={`${product.name} in ${product.color}`}
              />

              {product.badge && (
                <span className="product-badge">
                  {product.badge}
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div
                className="product-gallery-controls"
                role="group"
                aria-label={`${product.name} images`}
              >
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className={
                      activeImage === image.url
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setActiveImage(image.url)
                    }
                    aria-label={`View image ${
                      index + 1
                    } of ${images.length}`}
                    aria-pressed={
                      activeImage === image.url
                    }
                  >
                    <img
                      src={image.url}
                      alt=""
                    />
                  </button>
                ))}
              </div>
            )}

            {product.media?.length ? (
              <ProductMediaGallery
                productName={product.name}
                media={product.media}
                standalone
              />
            ) : null}
          </div>

          <div className="detail-information">
            <span className="eyebrow muted">
              NIKHATU /{" "}
              {product.department.toUpperCase()}
            </span>

            <h1>{product.name}</h1>

            <div className="detail-price">
              <strong>
                {formatPrice(product.price)}
              </strong>

              {product.originalPrice && (
                <del>
                  {formatPrice(
                    product.originalPrice,
                  )}
                </del>
              )}

              <small>
                Inclusive of all taxes
              </small>
            </div>

            <p className="detail-description">
              {product.description}
            </p>

            <div className="detail-color">
              <span
                className="color-swatch"
                style={{
                  background: product.colorHex,
                }}
              />

              <span>
                COLOUR:{" "}
                <strong>{product.color}</strong>
              </span>
            </div>

            <div className="size-header">
              <span>
                SELECT YOUR SIZE{" "}
                {size && (
                  <strong>— {size}</strong>
                )}
              </span>

              <Link
                href="/"
                onClick={(event) =>
                  event.preventDefault()
                }
              >
                Size guide{" "}
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="size-options">
              {product.sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    size === option
                      ? "selected"
                      : ""
                  }
                  aria-pressed={
                    size === option
                  }
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
              <p
                className="form-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="detail-purchase-row">
              <div className="quantity-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() =>
                    setQuantity(
                      Math.max(1, quantity - 1),
                    )
                  }
                >
                  <Minus size={14} />
                </button>

                <span>{quantity}</span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= 10}
                  onClick={() =>
                    setQuantity(
                      Math.min(10, quantity + 1),
                    )
                  }
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                className="button button-dark"
                onClick={() => addToBag(false)}
              >
                ADD TO BAG
                <ShoppingBag size={16} />
              </button>

              <button
                type="button"
                className="detail-wishlist"
                onClick={toggleWishlist}
                aria-label={
                  wishlist
                    ? "Remove from wishlist"
                    : "Save to wishlist"
                }
                aria-pressed={wishlist}
              >
                <Heart
                  size={20}
                  strokeWidth={1.3}
                  fill={
                    wishlist
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            <button
              type="button"
              className="button button-outline product-buy-now"
              onClick={() => addToBag(true)}
            >
              BUY NOW
              <ArrowRight size={16} />
            </button>

            <p className="detail-delivery">
              <Truck size={15} />
              Free delivery on orders ₹1,999+
              · 15-day returns
            </p>

            <details className="product-accordion">
              <summary>
                FIT & FABRIC
                <ArrowUpRight size={14} />
              </summary>

              <p>
                A relaxed, easy-to-wear fit.
                Thoughtfully selected breathable
                fabrics, finished with attention to
                every detail.
              </p>
            </details>

            <details className="product-accordion">
              <summary>
                CARE FOR YOUR EVERYDAY
                <ArrowUpRight size={14} />
              </summary>

              <p>
                Machine wash cold with similar
                colours. Turn inside out, avoid
                bleach, and dry in the shade.
              </p>
            </details>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products">
            <div className="collection-heading">
              <div>
                <span className="eyebrow">
                  YOU MAY ALSO LIKE
                </span>

                <h2>
                  More good choices.
                  <span className="heading-period">
                    .
                  </span>
                </h2>
              </div>
            </div>

            <div className="product-grid">
              {relatedProducts.map(
                (related) => (
                  <Link
                    key={related.id}
                    href={`/product/${encodeURIComponent(
                      related.id,
                    )}`}
                    className="product-card"
                  >
                    <div className="product-card-image">
                      <img
                        src={related.image}
                        alt={related.name}
                        loading="lazy"
                      />

                      {related.badge && (
                        <span className="product-badge">
                          {related.badge}
                        </span>
                      )}
                    </div>

                    <div className="product-card-info">
                      <span className="eyebrow muted">
                        {related.department.toUpperCase()}
                      </span>

                      <h3>{related.name}</h3>

                      <strong>
                        {formatPrice(
                          related.price,
                        )}
                      </strong>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </section>
        )}
      </main>

      {panel === "cart" && (
        <CartPanel
          products={[
            product,
            ...relatedProducts,
          ]}
          items={cart}
          subtotal={subtotal}
          onClose={() => setPanel(null)}
          onQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={() =>
            setPanel("checkout")
          }
        />
      )}

      {panel === "checkout" && (
        <CheckoutPanel
          products={[
            product,
            ...relatedProducts,
          ]}
          items={cart}
          subtotal={subtotal}
          customer={customer}
          onClose={() => setPanel(null)}
          onComplete={orderComplete}
          onTrack={() => setPanel(null)}
        />
      )}

      {toast && (
        <div
          className="toast"
          role="status"
        >
          <Check size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}