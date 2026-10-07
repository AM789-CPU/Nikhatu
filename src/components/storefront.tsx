"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowUpRight, Check, Heart, Menu, Search, ShieldCheck, ShoppingBag, Truck, UserRound, X, RotateCcw, LockKeyhole } from "lucide-react";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import ProductMediaGallery from "@/components/product-media-gallery";
import { AccountPanel, CartPanel, CheckoutPanel, InfoPanel, ProductDetail, SearchPanel, TrackPanel, WishlistPanel } from "@/components/store-dialogs";
import { type Product, type Theme, themeOf } from "@/lib/products";
import { ThemeIntro } from "@/components/theme-intro";
import type { CartItem, Customer, InfoTopic, Panel, PlacedOrder } from "@/lib/store-types";

const departments = ["all", "men", "women", "kids"];
const styleOptions: Record<Theme, string[]> = {
  classic: ["Shirts", "Jackets", "Polos"],
  monster: ["Jackets", "Tees", "Jeans", "Sweatshirts", "Thermals"],
};
const tiles: Record<Theme, string[]> = {
  classic: ["/images/classic/chore-jacket.jpg", "/images/classic/plaid.jpg", "/images/classic/rugby.jpg"],
  monster: ["/images/monster/collection/saint-olive-jacket.jpg", "/images/monster/collection/saints-sweatshirt.jpg", "/images/monster/collection/melancholy-thermal.jpg"],
};

const storefrontStorageKeys = ["nikhatu-bag", "nikhatu-wishlist", "nikhatu-last-order", "nikhatu-theme"];
const storefrontStorageEvent = "nikhatu:storage-change";

function subscribeToStorefrontStorage(onChange: () => void) {
  const handleStorage = (event: Event) => {
    if (event.type === "storage") {
      const storageEvent = event as StorageEvent;
      if (storageEvent.key !== null && !storefrontStorageKeys.includes(storageEvent.key)) return;
    }
    onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(storefrontStorageEvent, handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(storefrontStorageEvent, handleStorage);
  };
}

function getStorefrontStorageSnapshot() {
  try {
    return JSON.stringify(storefrontStorageKeys.map((key) => localStorage.getItem(key)));
  } catch {
    return "[null,null,null,null]";
  }
}

function getServerStorageSnapshot() {
  return "[null,null,null,null]";
}

function writeStorefrontStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(storefrontStorageEvent));
  } catch { /* Storage may be unavailable or full. */ }
}

export default function Storefront({ products, shopping = false, initialCategory = "all", initialSort = "featured" }: { products: Product[]; shopping?: boolean; initialCategory?: string; initialSort?: string }) {
  const storageSnapshot = useSyncExternalStore(subscribeToStorefrontStorage, getStorefrontStorageSnapshot, getServerStorageSnapshot);
  const [cartSnapshot, wishlistSnapshot, lastOrderSnapshot, themeSnapshot] = JSON.parse(storageSnapshot) as [string | null, string | null, string | null, string | null];
  const cart = useMemo(() => {
    try {
      const savedCart: unknown = JSON.parse(cartSnapshot || "[]");
      return Array.isArray(savedCart) ? savedCart.filter((item): item is CartItem => !!item && typeof item.productId === "string" && typeof item.size === "string" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10 && products.some((product) => product.id === item.productId && product.sizes.includes(item.size))) : [];
    } catch { return []; }
  }, [cartSnapshot, products]);
  const wishlist = useMemo(() => {
    try {
      const savedWishlist: unknown = JSON.parse(wishlistSnapshot || "[]");
      return Array.isArray(savedWishlist) ? savedWishlist.filter((id): id is string => typeof id === "string" && products.some((product) => product.id === id)) : [];
    } catch { return []; }
  }, [products, wishlistSnapshot]);
  const lastOrder = lastOrderSnapshot || "";
  const theme: Theme = themeSnapshot === "monster" ? "monster" : "classic";
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [category, setCategory] = useState(departments.includes(initialCategory) ? initialCategory : "all");
  const [style, setStyle] = useState("all");
  const [sort, setSort] = useState(initialSort);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [intro, setIntro] = useState<Theme | null>(null);
  const [toast, setToast] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  function setCart(update: CartItem[] | ((current: CartItem[]) => CartItem[])) {
    const next = typeof update === "function" ? update(cart) : update;
    writeStorefrontStorage("nikhatu-bag", JSON.stringify(next));
  }

  function setWishlist(update: string[] | ((current: string[]) => string[])) {
    const next = typeof update === "function" ? update(wishlist) : update;
    writeStorefrontStorage("nikhatu-wishlist", JSON.stringify(next));
  }

  useEffect(() => { fetch("/api/auth").then((r) => r.json()).then((data) => setCustomer(data.customer ?? null)).catch(() => {}); }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + (products.find((p) => p.id === item.productId)?.price ?? 0) * item.quantity, 0);
  const themeProducts = useMemo(() => products.filter((p) => themeOf(p) === theme), [products, theme]);
  const visibleProducts = useMemo(() => {
    const filtered = themeProducts.filter((p) => (category === "all" || p.department === category) && (style === "all" || p.category === style));
    if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
    if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
    if (sort === "new") filtered.sort((a, b) => Number(b.badge === "NEW IN") - Number(a.badge === "NEW IN"));
    return shopping ? filtered : filtered.slice(0, 4);
  }, [themeProducts, category, style, sort, shopping]);

  function switchTheme(next: Theme) {
    if (next === theme || intro) return;
    setMobileMenu(false);
    setIntro(next);
  }

  function applyTheme(next: Theme) {
    writeStorefrontStorage("nikhatu-theme", next); setStyle("all");
    setToast(next === "monster" ? "Monster mode on. Welcome to the dark side." : "Back to Classic.");
  }

  function toggleWishlist(id: string) {
    const exists = wishlist.includes(id);
    setWishlist((current) => exists ? current.filter((item) => item !== id) : [...current, id]);
    setToast(exists ? "Removed from your wishlist" : "Saved to your wishlist");
  }

  function addToCart(product: Product, size: string, quantity: number) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id && item.size === size);
      return existing ? current.map((item) => item === existing ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item) : [...current, { productId: product.id, size, quantity }];
    });
    setSelected(null); setPanel("cart"); setToast("A good choice. Added to your bag.");
  }

  function updateQuantity(productId: string, size: string, change: number) {
    setCart((current) => current.map((item) => item.productId === productId && item.size === size ? { ...item, quantity: Math.min(10, item.quantity + change) } : item).filter((item) => item.quantity > 0));
  }

  function removeFromCart(productId: string, size: string) {
    setCart((current) => current.filter((item) => !(item.productId === productId && item.size === size)));
  }

  function openProduct(product: Product) { setPanel(null); setSelected(product); }
  function closePanel() { setPanel(null); setSelected(null); }
  function showInfo(topic: InfoTopic) { setPanel(topic); }

  function orderComplete(order: PlacedOrder) {
    setCart([]); writeStorefrontStorage("nikhatu-last-order", order.orderNumber);
  }

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNewsletterBusy(true); setNewsletterStatus("");
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      setNewsletterStatus(data.message || data.error);
      if (response.ok) form.reset();
    } catch { setNewsletterStatus("Please try again in a moment."); }
    finally { setNewsletterBusy(false); }
  }

  return <div className="site-shell">
    <div className="announcement-bar"><span>FREE SHIPPING ON ORDERS ₹1,999+</span><span className="announcement-center">MADE IN INDIA. MADE FOR YOU.</span><div><button onClick={() => setPanel("track")}>TRACK ORDER</button><span className="announcement-divider" /><button onClick={() => showInfo("help")}>HELP</button></div></div>
    <header className="site-header">
      <button className="mobile-menu-toggle icon-button" aria-label={mobileMenu ? "Close navigation" : "Open navigation"} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
      <nav className="desktop-nav" aria-label="Main navigation"><Link className={shopping && category === "men" ? "active" : ""} href="/shop?category=men">MEN</Link><Link className={shopping && category === "women" ? "active" : ""} href="/shop?category=women">WOMEN</Link><Link className={shopping && category === "kids" ? "active" : ""} href="/shop?category=kids">KIDS</Link><Link href="/shop?sort=new" className="new-in-nav">NEW IN <span /></Link></nav>
      <Link className="header-wordmark" href="/" aria-label="NIKHATU home">{theme === "monster" ? <img className="header-logo" src="/images/monster/logo.png" alt="NIKHATU" /> : <img className="header-logo classic" src="/images/logo-classic.png" alt="NIKHATU" />}</Link>
      <nav className="header-utilities" aria-label="Shopping tools"><button onClick={() => setPanel("search")} aria-label="Search products"><Search size={18} strokeWidth={1.4} /><span>SEARCH</span></button><button onClick={() => setPanel("account")} className="account-utility" aria-label={customer ? "Your account" : "Sign in"}><UserRound size={18} strokeWidth={1.4} /><span>{customer ? customer.name.split(" ")[0].toUpperCase() : "ACCOUNT"}</span></button><button onClick={() => setPanel("wishlist")} className="wishlist-utility" aria-label={`Wishlist, ${wishlist.length} saved items`}><Heart size={18} strokeWidth={1.4} /><span>WISHLIST{wishlist.length > 0 ? ` (${wishlist.length})` : ""}</span></button><button onClick={() => setPanel("cart")} aria-label={`Shopping bag, ${cartCount} items`}><ShoppingBag size={18} strokeWidth={1.4} /><span>BAG ({cartCount})</span><span className="mobile-bag-count">{cartCount}</span></button></nav>
    </header>
    {mobileMenu && <nav className="mobile-navigation" aria-label="Mobile navigation"><Link href="/shop?category=men" onClick={() => setMobileMenu(false)}>Men <ArrowUpRight size={18} /></Link><Link href="/shop?category=women" onClick={() => setMobileMenu(false)}>Women <ArrowUpRight size={18} /></Link><Link href="/shop?category=kids" onClick={() => setMobileMenu(false)}>Kids <ArrowUpRight size={18} /></Link><Link href="/shop?sort=new" onClick={() => setMobileMenu(false)}>New arrivals <ArrowUpRight size={18} /></Link><button onClick={() => { setMobileMenu(false); setPanel("account"); }}>Your account <UserRound size={18} /></button><button onClick={() => { setMobileMenu(false); setPanel("wishlist"); }}>Your wishlist <Heart size={18} /></button></nav>}
    <main>
      {!shopping && <><Hero key={theme} theme={theme} /><section id="categories" className="category-strip" aria-label="Shop by category">{[
        { name: "Men", caption: "Elevated everyday essentials.", image: tiles[theme][0], label: "FOR HIM" },
        { name: "Women", caption: "Effortless style. Entirely you.", image: tiles[theme][1], label: "FOR HER" },
        { name: "Kids", caption: "Little people. Big adventures.", image: tiles[theme][2], label: "FOR THE LITTLE ONES" },
      ].map((item) => <Link key={item.name} className="category-tile" href={`/shop?category=${item.name.toLowerCase()}`}><div className="category-photo"><img src={item.image} alt={`${item.name}'s fashion collection`} loading="lazy" /></div><div className="category-text"><span className="category-label">{item.label}</span><h2>{item.name}</h2><p>{item.caption}</p><span className="category-link">SHOP {item.name.toUpperCase()} <ArrowRight size={14} /></span></div><ArrowUpRight className="category-corner" size={19} strokeWidth={1} /></Link>)}</section>
      <section className="editorial-banner"><img className="editorial-image" src={theme === "monster" ? "/images/monster/editorial.jpg" : "/images/editorial.jpg"} alt="A new perspective on everyday style, by NIKHATU" loading="lazy" /><div className="editorial-overlay" /><div className="editorial-copy"><span className="eyebrow">A NEW SEASON. A NEW PERSPECTIVE.</span><h2>{theme === "monster" ? <>FULL MONSTER.<br />NO FILTER.</> : <>NEW SEASON.<br />NEW ENERGY.</>}</h2><p>Fresh silhouettes. Familiar comfort.<br />Find your new everyday.</p><Link href="/shop?sort=new" className="button button-dark">EXPLORE THE EDIT <ArrowUpRight size={16} /></Link></div><span className="editorial-number">01 / THE NEW SEASON</span></section></>}
      <section className="assurance-strip" aria-label="The NIKHATU promise"><button onClick={() => showInfo("delivery")}><Truck size={29} strokeWidth={1.1} /><span><strong>FAST & FREE DELIVERY</strong><small>On orders above ₹1,999</small></span></button><button onClick={() => showInfo("returns")}><RotateCcw size={27} strokeWidth={1.1} /><span><strong>EASY RETURNS</strong><small>A little peace of mind. 15 days.</small></span></button><button onClick={() => showInfo("quality")}><ShieldCheck size={29} strokeWidth={1.1} /><span><strong>THOUGHTFUL QUALITY</strong><small>Better fabrics. Made to last.</small></span></button><button onClick={() => showInfo("payments")}><LockKeyhole size={27} strokeWidth={1.1} /><span><strong>SECURE CHECKOUT</strong><small>Your details, always protected.</small></span></button></section>
      <section id="collection" className={`collection-section ${shopping ? "shop-collection" : ""}`}>
        {shopping && <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>{category === "all" ? "The collection" : `${category.charAt(0).toUpperCase() + category.slice(1)}'s collection`}</span></div>}
        <div className="collection-heading"><div><span className="eyebrow">{shopping ? "YOUR EVERYDAY. ELEVATED." : "THE ONES YOU KEEP REACHING FOR"}</span><h2>{shopping ? (category === "all" ? "The collection." : `${category.charAt(0).toUpperCase() + category.slice(1)}. Your way.`) : "Best of NIKHATU"}<span className="heading-period">{shopping ? "" : "."}</span></h2>{shopping && <p>Thoughtfully made essentials. Effortlessly you.</p>}</div>{!shopping && <Link className="underlined-link" href="/shop">VIEW THE COLLECTION <ArrowUpRight size={14} /></Link>}{shopping && <span className="product-result-count">{visibleProducts.length} thoughtfully made pieces</span>}</div>
        <div className="collection-toolbar"><div className="department-tabs" role="group" aria-label="Filter by department">{departments.map((department) => <button key={department} className={category === department ? "active" : ""} aria-pressed={category === department} onClick={() => { setCategory(department); setStyle("all"); }}>{department === "all" ? "All" : department.charAt(0).toUpperCase() + department.slice(1)}</button>)}</div><div className="catalogue-selects">{shopping && <label><span className="sr-only">Filter by style</span><select value={style} onChange={(event) => setStyle(event.target.value)}><option value="all">All styles</option>{[...new Set([...styleOptions[theme], ...themeProducts.map((product) => product.category)])].map((name) => <option key={name}>{name}</option>)}</select></label>}<label><span className="sort-label">SORT BY:</span><select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="new">Newest arrivals</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div></div>
        <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} saved={wishlist.includes(product.id)} onSave={toggleWishlist} onOpen={openProduct} />)}</div>
        {visibleProducts.length === 0 && <div className="catalogue-empty"><p>No pieces in this edit just yet.</p><button className="underlined-link" onClick={() => { setCategory("all"); setStyle("all"); }}>EXPLORE ALL PIECES <ArrowRight size={14} /></button></div>}
        {!shopping && <div className="collection-bottom"><p>Good style does not have to try so hard.</p><Link href="/shop" className="button button-outline">FIND YOUR EVERYDAY <ArrowRight size={16} /></Link></div>}
      </section>
      <section className="brand-statement"><span className="eyebrow">NOT JUST A LABEL. A WAY OF BEING.</span><h2>Indian at heart.<br /><span>Individual by nature.</span></h2><div><p>We believe the best clothes feel like you.<br />Considered details. Honest fabrics. No unnecessary noise.<br />Made in India, for the way you move through the world.</p><button className="underlined-link" onClick={() => showInfo("story")}>MEET NIKHATU <ArrowUpRight size={15} /></button></div><span className="brand-star" aria-hidden="true">✳</span></section>
      <section className="newsletter-section"><div><span className="eyebrow">GOOD THINGS, BEFORE EVERYONE ELSE.</span><h2>Be in the know.</h2><p>New drops, fresh perspectives, and a little NIKHATU in your inbox.</p></div><div className="newsletter-form-wrap"><form onSubmit={subscribe}><label className="sr-only" htmlFor="newsletter-email">Your email address</label><input id="newsletter-email" type="email" name="email" placeholder="Your email address" required maxLength={254} /><button type="submit" disabled={newsletterBusy} aria-label="Subscribe to the NIKHATU newsletter">{newsletterBusy ? <span className="spinner" /> : <ArrowRight size={23} strokeWidth={1.2} />}</button></form><p className="newsletter-note" aria-live="polite">{newsletterStatus || "Only the good stuff. Unsubscribe whenever."}</p></div></section>
    </main>
    <footer className="site-footer"><div className="footer-top"><div className="footer-brand"><Link href="/" className="footer-wordmark">NIKHATU<span>®</span></Link><p>Rooted in India.<br />Ready for everywhere.</p><span className="made-in-india"><span /> PROUDLY MADE IN INDIA</span></div><div className="footer-link-group"><h3>FIND YOUR FIT</h3><Link href="/shop?category=men">Men</Link><Link href="/shop?category=women">Women</Link><Link href="/shop?category=kids">Kids</Link><Link href="/shop?sort=new">New arrivals</Link></div><div className="footer-link-group"><h3>HERE TO HELP</h3><button onClick={() => setPanel("track")}>Track your order</button><button onClick={() => showInfo("delivery")}>Shipping & delivery</button><button onClick={() => showInfo("returns")}>Returns & exchanges</button><button onClick={() => showInfo("size")}>Size guide</button></div><div className="footer-link-group"><h3>A LITTLE ABOUT US</h3><button onClick={() => showInfo("story")}>Our story</button><button onClick={() => showInfo("quality")}>Our promise</button><button onClick={() => showInfo("help")}>Get in touch</button><button onClick={() => showInfo("privacy")}>Privacy policy</button></div><button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"><ArrowUp size={21} strokeWidth={1.2} /></button></div><div className="footer-bottom"><span>© 2026 NIKHATU. ALL YOURS.</span><span className="footer-closing">GOOD CLOTHES. GOOD ENERGY.</span><span><LockKeyhole size={12} /> SECURE CHECKOUT · PAY ON DELIVERY</span></div></footer>
    {selected && <>
      <ProductDetail product={selected} saved={wishlist.includes(selected.id)} onClose={closePanel} onSave={() => toggleWishlist(selected.id)} onAdd={addToCart} />
      {selected.media?.length ? <ProductMediaGallery key={selected.id} productName={selected.name} media={selected.media} /> : null}
      {(selected.images?.length ?? 0) > 1 && <div className="product-gallery-controls" role="group" aria-label={`${selected.name} images`}>
        {selected.images!.map((image, index) => <button key={image.id} type="button" className={selected.image === image.url ? "active" : ""} onClick={() => setSelected((current) => current ? { ...current, image: image.url } : null)} aria-label={`View image ${index + 1} of ${selected.images!.length}`} aria-pressed={selected.image === image.url}><img src={image.url} alt="" /></button>)}
      </div>}
    </>}
    {panel === "cart" && <CartPanel products={products} items={cart} subtotal={subtotal} onClose={closePanel} onQuantity={updateQuantity} onRemove={removeFromCart} onCheckout={() => setPanel("checkout")} />}
    {panel === "wishlist" && <WishlistPanel products={products.filter((p) => wishlist.includes(p.id))} onClose={closePanel} onOpen={openProduct} onRemove={toggleWishlist} />}
    {panel === "search" && <SearchPanel products={themeProducts} onClose={closePanel} onOpen={openProduct} />}
    {panel === "account" && <AccountPanel customer={customer} onClose={closePanel} onCustomer={setCustomer} />}
    {panel === "checkout" && <CheckoutPanel products={products} items={cart} subtotal={subtotal} customer={customer} onClose={closePanel} onComplete={orderComplete} onTrack={() => setPanel("track")} />}
    {panel === "track" && <TrackPanel orderNumber={lastOrder} email={customer?.email ?? ""} onClose={closePanel} />}
    {panel && ["help", "delivery", "returns", "quality", "payments", "story", "privacy", "size"].includes(panel) && <InfoPanel topic={panel as InfoTopic} onClose={closePanel} />}
    {intro && <ThemeIntro theme={intro} onSwitch={() => applyTheme(intro)} onClose={() => setIntro(null)} />}
    <div className="theme-switch" role="group" aria-label="Choose theme"><button className={theme === "classic" ? "active" : ""} aria-pressed={theme === "classic"} onClick={() => switchTheme("classic")}>CLASSIC</button><button className={theme === "monster" ? "active" : ""} aria-pressed={theme === "monster"} onClick={() => switchTheme("monster")}>MONSTER</button></div>
    {toast && <div className="toast" role="status"><Check size={16} /><span>{toast}</span><button onClick={() => setToast("")} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </div>;
}
