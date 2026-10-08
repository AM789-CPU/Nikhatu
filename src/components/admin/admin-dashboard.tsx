"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowUpRight, Bell, Box, ChartNoAxesCombined, ChevronDown, CircleDollarSign, Clock3, LayoutDashboard, LogOut, Package, Plus, Search, Settings, Star, Users, X } from "lucide-react";
import type { Product } from "@/lib/products";
import { orderStatuses, type AdminOrderStatus, type AdminProductImageInput, type AdminProductMediaInput } from "@/lib/admin-validation";
import type { OrderLine, ShippingAddress } from "@/db/schema";
import ProductImageGalleryEditor from "@/components/admin/product-image-gallery-editor";
import ProductMediaEditor from "@/components/admin/product-media-editor";
import styles from "./admin-dashboard.module.css";

type Section = "dashboard" | "orders" | "products" | "add-product" | "customers" | "analytics" | "settings";
type AdminOrder = { id: string; orderNumber: string; customerId: string | null; email: string; items: OrderLine[]; address: ShippingAddress; subtotal: number; shipping: number; total: number; status: string; createdAt: string | Date };
type AdminCustomer = { id: string; name: string; email: string; createdAt: string | Date };
type Draft = Omit<Product, "id">;
type SalePoint = { label: string; value: number; dateKey: string };

const sections: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: Package },
  { id: "products", label: "Products", icon: Box },
  { id: "add-product", label: "Add Product", icon: Plus },
  { id: "customers", label: "Customers", icon: Users },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { id: "settings", label: "Settings", icon: Settings },
];

const blankDraft: Draft = { name: "", description: "", department: "men", category: "", price: 0, originalPrice: null, image: "", color: "", colorHex: "#222222", sizes: [], badge: null, featured: false, isActive: true };
const blankMedia: AdminProductMediaInput = { videos: [], spinFrames: [] };
const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const formatDate = (value: string | Date) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const formatDateTime = (value: string | Date) => new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function salesFor(orders: AdminOrder[], days: number): SalePoint[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const date = new Date(order.createdAt);
    if (date < start) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    totals.set(key, (totals.get(key) ?? 0) + order.total);
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return { label: days === 7 ? date.toLocaleDateString("en-IN", { weekday: "short" }) : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: totals.get(key) ?? 0, dateKey: key };
  });
}

function SalesChart({ points }: { points: SalePoint[] }) {
  const width = 820, height = 230, insetX = 8, insetY = 16;
  const max = Math.max(...points.map((point) => point.value), 1);
  const coordinates = points.map((point, index) => ({ x: insetX + index * (width - insetX * 2) / Math.max(points.length - 1, 1), y: height - insetY - point.value / max * (height - insetY * 2) }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${coordinates[0]?.x},${height - insetY} ${line} ${coordinates.at(-1)?.x},${height - insetY}`;
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return <div className={styles.chartWrap}>
    <div className={styles.chartTotal}><span>Order value in selected period</span><strong>{money(total)}</strong></div>
    <svg className={styles.salesChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily order sales line chart">
      <defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#34715a" stopOpacity=".18" /><stop offset="1" stopColor="#34715a" stopOpacity="0" /></linearGradient></defs>
      {[.25, .5, .75, 1].map((step) => <line key={step} x1="0" x2={width} y1={height - insetY - (height - insetY * 2) * step} y2={height - insetY - (height - insetY * 2) * step} className={styles.chartGrid} />)}
      <polygon points={area} fill="url(#sales-fill)" />
      <polyline points={line} className={styles.chartLine} />
      {coordinates.map((point, index) => <circle key={points[index].dateKey} cx={point.x} cy={point.y} r="3.5" className={styles.chartPoint}><title>{points[index].label}: {money(points[index].value)}</title></circle>)}
    </svg>
    <div className={styles.chartLabels}>{points.filter((_, index) => points.length <= 8 || index % Math.ceil(points.length / 7) === 0 || index === points.length - 1).map((point) => <span key={point.dateKey}>{point.label}</span>)}</div>
  </div>;
}

export type AdminDashboardOrder = AdminOrder;
export type AdminDashboardCustomer = AdminCustomer;

export default function AdminDashboard({ adminName, initialProducts, initialOrders, initialCustomers }: { adminName: string; initialProducts: Product[]; initialOrders: AdminOrder[]; initialCustomers: AdminCustomer[] }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("dashboard");
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [customers, setCustomers] = useState(initialCustomers);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [galleryImages, setGalleryImages] = useState<AdminProductImageInput[]>([]);

const [selectedThemes, setSelectedThemes] = useState<string[]>(["classic"]);

  const [initialMedia, setInitialMedia] = useState<Product["media"]>([]);
  const [mediaPayload, setMediaPayload] = useState<AdminProductMediaInput>(blankMedia);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sizesText, setSizesText] = useState("");
  const [range, setRange] = useState<7 | 30>(7);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("active");
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadFailed, setImageUploadFailed] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadFailed, setMediaUploadFailed] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  async function loadData() {
    const responses = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/orders"), fetch("/api/admin/customers")]);
    if (responses.some((response) => response.status === 401)) {
      router.replace("/admin/login");
      return;
    }
    const results = await Promise.all(responses.map((response) => response.json()));
    if (responses.some((response) => !response.ok)) throw new Error(results.find((result, index) => !responses[index].ok)?.error || "Unable to load dashboard data.");
    setProducts(results[0].products);
    setOrders(results[1].orders);
    setCustomers(results[2].customers);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function startNewProduct() {
    setEditingId(null);
    setDraft(blankDraft);
    setGalleryImages([]);
    setInitialMedia([]);
    setMediaPayload(blankMedia);
    setSizesText("");
    setToast(null);
    setSection("add-product");
  }

  function startEdit(product: Product) {
    const { id, ...productDraft } = product;
    setEditingId(id);
    setDraft(productDraft);
    setGalleryImages((product.images?.length ? product.images : [{ url: product.image, sortOrder: 0, isPrimary: true }]).map(({ url, sortOrder, isPrimary }) => ({ url, sortOrder, isPrimary })));
    setInitialMedia(product.media ?? []);
    setMediaPayload({
      videos: (product.media ?? []).filter((item) => item.type === "video").sort((a, b) => a.sortOrder - b.sortOrder).map(({ url }, sortOrder) => ({ url, sortOrder })),
      spinFrames: (product.media ?? []).filter((item) => item.type === "360").sort((a, b) => a.sortOrder - b.sortOrder).map(({ url }, sortOrder) => ({ url, sortOrder })),
    });
    setSizesText(product.sizes.join(", "));
    setSection("add-product");
    setToast(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearDraft() {
    setEditingId(null);
    setDraft(blankDraft);
    setGalleryImages([]);
    setInitialMedia([]);
    setMediaPayload(blankMedia);
    setSizesText("");
  }

  function setField<Key extends keyof Draft>(field: Key, value: Draft[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (imageUploading || mediaUploading || imageUploadFailed || mediaUploadFailed) {
      setToast({ message: "Finish or remove failed media uploads before saving.", kind: "error" });
      return;
    }
    if (!galleryImages.length) {
      setToast({ message: "Upload at least one product image before saving.", kind: "error" });
      return;
    }
    setBusy(true);
    setToast(null);
    const primaryImage = galleryImages.find((image) => image.isPrimary) ?? galleryImages[0];
    const payload = { ...draft, image: primaryImage.url, images: galleryImages.map((image, sortOrder) => ({ ...image, sortOrder })), media: mediaPayload, themes: selectedThemes,sizes: sizesText.split(",").map((size) => size.trim()).filter(Boolean) };
    
    try {
      const response = await fetch(editingId ? `/api/admin/products/${encodeURIComponent(editingId)}` : "/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");
      await loadData();
      clearDraft();
      setSection("products");
      setToast({ message: editingId ? "Product changes saved." : "Product added to the catalogue.", kind: "success" });
    } catch (reason) {
      setToast({ message: reason instanceof Error ? reason.message : "Unable to save product.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function updateProduct(product: Product, changes: Partial<Draft>) {
    const { id, ...current } = product;
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...current, ...changes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update product.");
      setProducts((items) => items.map((item) => item.id === id ? result.product : item));
    } catch (reason) {
      setToast({ message: reason instanceof Error ? reason.message : "Unable to update product.", kind: "error" });
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Remove ${product.name} from the storefront?`)) return;
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove product.");
      setProducts((items) => items.map((item) => item.id === product.id ? { ...item, isActive: false } : item));
      setToast({ message: "Product hidden from the storefront.", kind: "success" });
    } catch (reason) {
      setToast({ message: reason instanceof Error ? reason.message : "Unable to remove product.", kind: "error" });
    }
  }

  async function updateOrderStatus(order: AdminOrder, status: AdminOrderStatus) {
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update order.");
      setOrders((items) => items.map((item) => item.id === order.id ? result.order : item));
      setToast({ message: `Order ${order.orderNumber} updated.`, kind: "success" });
    } catch (reason) {
      setToast({ message: reason instanceof Error ? reason.message : "Unable to update order.", kind: "error" });
    }
  }

  async function signOut() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  const normalizedSearch = search.trim().toLowerCase();
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesFilter = productFilter === "all" || (productFilter === "active" ? product.isActive : !product.isActive);
    const matchesSearch = !normalizedSearch || `${product.name} ${product.category} ${product.department}`.toLowerCase().includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  }), [products, productFilter, normalizedSearch]);
  const filteredOrders = useMemo(() => orders.filter((order) => !normalizedSearch || `${order.orderNumber} ${order.email} ${order.address.name} ${order.items.map((item) => item.name).join(" ")}`.toLowerCase().includes(normalizedSearch)), [orders, normalizedSearch]);
  const filteredCustomers = useMemo(() => customers.filter((customer) => !normalizedSearch || `${customer.name} ${customer.email}`.toLowerCase().includes(normalizedSearch)), [customers, normalizedSearch]);
  const activeProducts = products.filter((product) => product.isActive).length;
  const pendingOrders = orders.filter((order) => ["confirmed", "processing"].includes(order.status)).length;
  const salesTotal = orders.filter((order) => order.status !== "cancelled").reduce((total, order) => total + order.total, 0);
  const chartPoints = useMemo(() => salesFor(orders, range), [orders, range]);
  const topProducts = useMemo(() => {
    const sales = new Map<string, number>();
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      for (const item of order.items) sales.set(item.productId, (sales.get(item.productId) ?? 0) + item.quantity);
    }
    return [...sales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, units]) => ({ product: products.find((item) => item.id === id), archivedLine: orders.flatMap((order) => order.items).find((item) => item.productId === id), units }));
  }, [orders, products]);
  const productCountByStatus = products.length;
  const sectionTitle = sections.find((item) => item.id === section)?.label ?? "Dashboard";

  function openSection(nextSection: Section) {
    setSearch("");
    if (nextSection === "add-product") {
      clearDraft();
      setToast(null);
    }
    setSection(nextSection);
  }

  function renderOrderTable(list: AdminOrder[]) {
    if (!list.length) return <div className={styles.emptyState}>No orders to show yet.</div>;
    return <div className={styles.tableScroll}><table className={styles.dataTable}><thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{list.map((order) => <tr key={order.id}>
      <td><strong>{order.orderNumber}</strong></td><td><span className={styles.tableMain}>{order.address.name}</span><small>{order.email}</small></td><td>{order.items[0]?.name ?? "Order item"}{order.items.length > 1 && <small>+ {order.items.length - 1} more</small>}</td><td>{money(order.total)}</td><td><span className={`${styles.statusPill} ${styles[`status_${order.status}`] ?? ""}`}>{order.status}</span></td><td>{formatDate(order.createdAt)}</td>
    </tr>)}</tbody></table></div>;
  }

  function renderSales() {
    return <section className={styles.panel}>
      <div className={styles.panelHeader}><div><p className={styles.eyebrow}>PERFORMANCE</p><h2>Sales overview</h2></div><div className={styles.rangeControl} role="group" aria-label="Sales period"><button className={range === 7 ? styles.rangeActive : ""} onClick={() => setRange(7)}>7 days</button><button className={range === 30 ? styles.rangeActive : ""} onClick={() => setRange(30)}>30 days</button></div></div>
      <SalesChart points={chartPoints} />
    </section>;
  }

  function renderTopProducts() {
    return <section className={styles.panel}>
      <div className={styles.panelHeader}><div><p className={styles.eyebrow}>BEST SELLERS</p><h2>Top products</h2></div><button className={styles.panelLink} onClick={() => openSection("products")}>View catalogue <ArrowUpRight size={14} /></button></div>
      {topProducts.length ? <div className={styles.topProductList}>{topProducts.map(({ product, archivedLine, units }) => <div className={styles.topProduct} key={archivedLine?.productId}>
        <img src={product?.image ?? archivedLine?.image ?? ""} alt="" />
        <div><strong>{product?.name ?? archivedLine?.name ?? "Archived product"}</strong><span>{product?.category ?? "Archived"}</span></div>
        <span className={styles.topProductPrice}>{money(product?.price ?? archivedLine?.price ?? 0)}</span><small>{units} sold</small>
      </div>)}</div> : <div className={styles.emptyState}>Sales will appear here after orders are placed.</div>}
    </section>;
  }

  function renderDashboard() {
    const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
    return <>
      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}><span className={styles.summaryIcon}><Clock3 size={18} /></span><span className={styles.summaryLabel}>Pending orders</span><strong>{pendingOrders}</strong><small>Confirmed and processing</small></div>
        <div className={styles.summaryCard}><span className={styles.summaryIcon}><Box size={18} /></span><span className={styles.summaryLabel}>Active products</span><strong>{activeProducts}</strong><small>Visible in storefront</small></div>
        <div className={styles.summaryCard}><span className={styles.summaryIcon}><CircleDollarSign size={18} /></span><span className={styles.summaryLabel}>Total sales</span><strong>{money(salesTotal)}</strong><small>Excludes cancelled orders</small></div>
        <div className={styles.summaryCard}><span className={styles.summaryIcon}><Activity size={18} /></span><span className={styles.summaryLabel}>Wallet / balance</span><strong className={styles.balanceValue}>Not connected</strong><small>Payout data is not stored</small></div>
      </section>
      <div className={styles.dashboardGrid}><div className={styles.dashboardPrimary}>{renderSales()}<section className={styles.panel}>
        <div className={styles.panelHeader}><div><p className={styles.eyebrow}>LATEST ACTIVITY</p><h2>Recent orders</h2></div><button className={styles.panelLink} onClick={() => openSection("orders")}>All orders <ArrowUpRight size={14} /></button></div>
        {renderOrderTable(recentOrders)}
      </section></div><div className={styles.dashboardSecondary}>{renderTopProducts()}<section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>STORE SNAPSHOT</p><h2>Quick view</h2></div></div><div className={styles.quickStats}><div><span>Customers</span><strong>{customers.length}</strong></div><div><span>All products</span><strong>{productCountByStatus}</strong></div><div><span>Pending orders</span><strong>{pendingOrders}</strong></div></div></section></div></div>
    </>;
  }

  function renderProducts() {
    return <section className={styles.panel}>
      <div className={styles.panelHeader}><div><p className={styles.eyebrow}>CATALOGUE MANAGEMENT</p><h2>Products <span className={styles.countText}>{visibleProducts.length}</span></h2></div><div className={styles.productsControls}><label className={styles.filterControl}><span>Filter</span><select aria-label="Filter products" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option value="active">Active</option><option value="all">All products</option><option value="hidden">Hidden</option></select><ChevronDown size={13} /></label><button className={styles.primaryAction} onClick={startNewProduct}><Plus size={16} /> Add product</button></div></div>
      {!visibleProducts.length ? <div className={styles.emptyState}>No matching products. Adjust your search or add a product.</div> : <div className={styles.tableScroll}><table className={`${styles.dataTable} ${styles.productTable}`}><thead><tr><th>Image</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id}>
        <td><img className={styles.productThumb} src={product.image} alt="" /></td><td><span className={styles.tableMain}>{product.name}</span><small>{product.department}</small></td><td>{product.category}</td><td>{money(product.price)}{product.originalPrice && <small className={styles.oldPrice}>{money(product.originalPrice)}</small>}</td><td className={styles.notTracked}>Not tracked</td><td><span className={`${styles.statusPill} ${product.isActive ? styles.status_active : styles.status_hidden}`}>{product.isActive ? "Active" : "Hidden"}</span></td>
        <td><button className={`${styles.starToggle} ${product.featured ? styles.starActive : ""}`} onClick={() => updateProduct(product, { featured: !product.featured })} aria-label={`${product.featured ? "Unfeature" : "Feature"} ${product.name}`} aria-pressed={product.featured}><Star size={17} fill={product.featured ? "currentColor" : "none"} /></button></td><td><div className={styles.tableActions}><button onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`}>Edit</button><button onClick={() => updateProduct(product, { isActive: !product.isActive })} aria-label={`${product.isActive ? "Hide" : "Show"} ${product.name}`}>{product.isActive ? "Hide" : "Show"}</button><button className={styles.deleteAction} onClick={() => removeProduct(product)} aria-label={`Delete ${product.name}`}>Delete</button></div></td>
      </tr>)}</tbody></table></div>}
      <p className={styles.tableNote}>Stock is not tracked by the existing product schema. Delete hides products while preserving database and order history.</p>
    </section>;
  }

  function renderProductForm() {
    return <form className={styles.productEditor} onSubmit={saveProduct}>
      <section className={styles.formPanel}><div className={styles.formSectionHeading}><span>01</span><div><p className={styles.eyebrow}>PRODUCT INFORMATION</p><h2>Make it yours</h2></div></div><div className={styles.formGrid}>
        <label className={styles.formWide}>Product name<input required maxLength={160} value={draft.name} onChange={(event) => setField("name", event.target.value)} placeholder="e.g. The Indigo Chore Jacket" /></label>
        <label className={styles.formWide}>Description<textarea required maxLength={4000} rows={4} value={draft.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the piece, its fabric, fit and details." /></label>
        <label>Department<select value={draft.department} onChange={(event) => setField("department", event.target.value)}><option value="men">Men</option><option value="women">Women</option><option value="kids">Kids</option></select></label>
        <label>Category<input required maxLength={80} value={draft.category} onChange={(event) => setField("category", event.target.value)} placeholder="Jackets" /></label>
      </div></section>
      <section className={styles.formPanel}><div className={styles.formSectionHeading}><span>02</span><div><p className={styles.eyebrow}>PRICING</p><h2>Set the price</h2></div></div><div className={styles.formGrid}>
        <label>Selling price<input required type="number" min="1" max="10000000" step="1" value={draft.price || ""} onChange={(event) => setField("price", Number(event.target.value))} /></label>
        <label>Original price<input type="number" min="0" max="10000000" step="1" value={draft.originalPrice ?? ""} onChange={(event) => setField("originalPrice", event.target.value === "" ? null : Number(event.target.value))} /></label>
      </div></section>
      <section className={styles.formPanel}><div className={styles.formSectionHeading}><span>03</span><div><p className={styles.eyebrow}>PRODUCT IMAGES</p><h2>Choose up to 8 images</h2></div></div><ProductImageGalleryEditor key={editingId ?? "new-product"} initialImages={galleryImages} onChange={setGalleryImages} onStatusChange={(isUploading, failed) => { setImageUploading(isUploading); setImageUploadFailed(failed); }} /></section>
      <section className={styles.formPanel}><div className={styles.formSectionHeading}><span>04</span><div><p className={styles.eyebrow}>VIDEO & 360° MEDIA</p><h2>Show the piece in motion</h2></div></div><ProductMediaEditor key={`media-${editingId ?? "new-product"}`} initialMedia={initialMedia ?? []} onChange={setMediaPayload} onStatusChange={(isUploading, failed) => { setMediaUploading(isUploading); setMediaUploadFailed(failed); }} /></section>
      <section className={styles.formPanel}><div className={styles.formSectionHeading}><span>05</span><div><p className={styles.eyebrow}>VARIANTS</p><h2>Color and sizing</h2></div></div><div className={styles.formGrid}>
        <label>Color name<input required maxLength={80} value={draft.color} onChange={(event) => setField("color", event.target.value)} placeholder="Indigo" /></label>
        <label>Color hex<div className={styles.colorField}><input type="color" value={draft.colorHex} onChange={(event) => setField("colorHex", event.target.value)} /><span>{draft.colorHex.toUpperCase()}</span></div></label>
        <label className={styles.formWide}>Sizes <small>Separate sizes with commas</small><input required maxLength={800} value={sizesText} onChange={(event) => setSizesText(event.target.value)} placeholder="XS, S, M, L, XL" /></label>
      </div></section>
      <section className={styles.formPanel}><div className={styles.formSectionHeading}><span>06</span><div>
        <div className={styles.formWide}>
  <span>Store Theme</span>

  <div>
    <label>
      <input
        type="checkbox"
        checked={selectedThemes.includes("classic")}
        onChange={(event) => {
          setSelectedThemes((current) =>
            event.target.checked
              ? [...current, "classic"]
              : current.filter((theme) => theme !== "classic"),
          );
        }}
      />
      Classic
    </label>

    <label>
      <input
        type="checkbox"
        checked={selectedThemes.includes("monster")}
        onChange={(event) => {
          setSelectedThemes((current) =>
            event.target.checked
              ? [...current, "monster"]
              : current.filter((theme) => theme !== "monster"),
          );
        }}
      />
      Monster
    </label>
  </div>
</div>
        
        <p className={styles.eyebrow}>STORE SETTINGS</p><h2>Ready for the edit</h2></div></div><div className={styles.formGrid}>
        <label className={styles.formWide}>Badge <small>Optional</small><input maxLength={40} value={draft.badge ?? ""} onChange={(event) => setField("badge", event.target.value || null)} placeholder="NEW IN" /></label>
        <div className={styles.formWide + " " + styles.switchGroup}><label className={styles.switchRow}><input type="checkbox" checked={draft.featured} onChange={(event) => setField("featured", event.target.checked)} /><span><strong>Featured product</strong><small>Prioritize this piece in curated placements.</small></span></label><label className={styles.switchRow}><input type="checkbox" checked={draft.isActive} onChange={(event) => setField("isActive", event.target.checked)} /><span><strong>Visible in store</strong><small>Customers can discover and order this product.</small></span></label></div>
      </div></section>
      <div className={styles.stickyActions}><button type="button" className={styles.cancelAction} onClick={() => { clearDraft(); setSection("products"); }}>Cancel</button><button className={styles.primaryAction} disabled={busy || imageUploading || mediaUploading || imageUploadFailed || mediaUploadFailed}>{busy ? "Saving..." : imageUploading || mediaUploading ? "Uploading media..." : imageUploadFailed || mediaUploadFailed ? "Retry or remove failed media" : <><Plus size={16} /> Save product</>}</button></div>
    </form>;
  }

  function renderOrders() {
    return <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>FULFILMENT</p><h2>Orders <span className={styles.countText}>{filteredOrders.length}</span></h2></div></div>
      {!filteredOrders.length ? <div className={styles.emptyState}>No matching orders.</div> : <div className={styles.orderCards}>{[...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => <article className={styles.orderCard} key={order.id}>
        <div className={styles.orderCardHead}><div><strong>{order.orderNumber}</strong><span>{formatDateTime(order.createdAt)}</span></div><strong>{money(order.total)}</strong></div><div className={styles.orderItems}>{order.items.map((item, index) => <div key={`${item.productId}-${item.size}-${index}`}><img src={item.image} alt="" /><span>{item.quantity} × {item.name} <small>Size {item.size}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className={styles.orderFooter}><div><strong>{order.address.name}</strong><span>{order.email}</span><span>{order.address.phone} · {order.address.city}</span></div><label className={styles.orderStatus}>Order status<select value={orderStatuses.includes(order.status as AdminOrderStatus) ? order.status : "confirmed"} onChange={(event) => void updateOrderStatus(order, event.target.value as AdminOrderStatus)}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={13} /></label></div>
      </article>)}</div>}
    </section>;
  }

  function renderCustomers() {
    return <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>COMMUNITY</p><h2>Customers <span className={styles.countText}>{filteredCustomers.length}</span></h2></div></div>
      {!filteredCustomers.length ? <div className={styles.emptyState}>No matching customers.</div> : <div className={styles.tableScroll}><table className={styles.dataTable}><thead><tr><th>Customer</th><th>Email</th><th>Joined</th></tr></thead><tbody>{filteredCustomers.map((customer) => <tr key={customer.id}><td><span className={styles.tableMain}>{customer.name}</span></td><td>{customer.email}</td><td>{formatDate(customer.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>;
  }

  function renderAnalytics() {
    return <><section className={styles.summaryGrid}><div className={styles.summaryCard}><span className={styles.summaryLabel}>Gross order value</span><strong>{money(salesTotal)}</strong><small>Cancelled orders excluded</small></div><div className={styles.summaryCard}><span className={styles.summaryLabel}>Average order</span><strong>{money(orders.length ? Math.round(salesTotal / Math.max(1, orders.filter((order) => order.status !== "cancelled").length)) : 0)}</strong><small>Across non-cancelled orders</small></div><div className={styles.summaryCard}><span className={styles.summaryLabel}>Customers</span><strong>{customers.length}</strong><small>Registered accounts</small></div><div className={styles.summaryCard}><span className={styles.summaryLabel}>Active products</span><strong>{activeProducts}</strong><small>Currently available</small></div></section><div className={styles.analyticsGrid}>{renderSales()}{renderTopProducts()}</div></>;
  }

  function renderSettings() {
    return <section className={styles.panel}><div className={styles.panelHeader}><div><p className={styles.eyebrow}>ACCOUNT</p><h2>Store settings</h2></div></div><div className={styles.settingsRows}><div><span>Administrator</span><strong>{adminName}</strong></div><div><span>Session</span><strong>Secure · expires after 8 hours</strong></div><div><span>Image storage</span><strong>Vercel Blob · one public image per product</strong></div><div><span>Inventory</span><strong>Stock quantities are not part of the current schema</strong></div><div><span>Wallet</span><strong>No payout balance integration is configured</strong></div></div></section>;
  }

  return <div className={styles.adminShell}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.sideBrand}><img src="/images/logo-classic.png" alt="NIKHATU" /><span>SELLER STUDIO</span></Link>
      <div className={styles.sideLabel}>WORKSPACE</div>
      <nav className={styles.sideNav} aria-label="Admin navigation">{sections.map(({ id, label, icon: Icon }) => <button className={section === id ? styles.sideLinkActive : styles.sideLink} key={id} onClick={() => openSection(id)}><Icon size={17} strokeWidth={1.7} /><span>{label}</span>{id === "orders" && pendingOrders > 0 && <small>{pendingOrders}</small>}</button>)}</nav>
      <div className={styles.sidebarBottom}><div className={styles.sideProfile}><span className={styles.profileInitial}>{adminName.trim().charAt(0).toUpperCase()}</span><span><strong>{adminName}</strong><small>Administrator</small></span><ChevronDown size={14} /></div><button className={styles.logoutSide} onClick={signOut}><LogOut size={16} /> Log out</button><span className={styles.sideVersion}>NIKHATU / SELLER STUDIO</span></div>
    </aside>
    <div className={styles.adminMain}>
      <header className={styles.mainHeader}><div className={styles.mobileBrand}><img src="/images/logo-classic.png" alt="NIKHATU" /><span>ADMIN</span></div><div className={styles.headerTitle}><p className={styles.eyebrow}>NIKHATU / SELLER STUDIO</p><h1>{sectionTitle}</h1></div><div className={styles.headerTools}><label className={styles.globalSearch}><Search size={16} /><input aria-label="Search dashboard" placeholder="Search products, orders, customers" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label><button className={styles.notificationButton} onClick={() => openSection("orders")} aria-label={`${pendingOrders} pending order notifications`}><Bell size={18} />{pendingOrders > 0 && <i />}</button><span className={styles.headerDivider} /><div className={styles.headerProfile}><span className={styles.profileInitial}>{adminName.trim().charAt(0).toUpperCase()}</span><span><strong>{adminName}</strong><small>Signed in as {adminName}</small></span></div><button className={styles.headerLogout} onClick={signOut} aria-label="Logout"><LogOut size={16} /></button></div></header>
      <main className={styles.pageContent}>
        {section === "dashboard" && renderDashboard()}
        {section === "products" && renderProducts()}
        {section === "add-product" && <><div className={styles.editorIntro}><div><p className={styles.eyebrow}>{editingId ? "EDIT CATALOGUE ITEM" : "NEW CATALOGUE ITEM"}</p><h2>{editingId ? "Edit product" : "Add product"}</h2><p>Thoughtful details make a piece worth finding.</p></div><button className={styles.cancelAction} onClick={() => { clearDraft(); setSection("products"); }}><X size={15} /> Close</button></div>{renderProductForm()}</>}
        {section === "orders" && renderOrders()}
        {section === "customers" && renderCustomers()}
        {section === "analytics" && renderAnalytics()}
        {section === "settings" && renderSettings()}
      </main>
      <footer className={styles.mainFooter}><span>© NIKHATU SELLER STUDIO</span><span>Thoughtfully managed in India</span></footer>
    </div>
    {toast && <div className={`${styles.toast} ${toast.kind === "error" ? styles.toastError : ""}`} role="status"><span>{toast.kind === "success" ? <ArrowUpRight size={15} /> : <X size={15} />}</span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </div>;
}