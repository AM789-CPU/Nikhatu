"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, Box, Check, ChevronDown, CircleDollarSign, LogOut, Package, Save, ShoppingBag, Trash2, X } from "lucide-react";
import type { Product } from "@/lib/products";
import { orderStatuses, type AdminOrderStatus } from "@/lib/admin-validation";
import type { OrderLine, ShippingAddress } from "@/db/schema";
import styles from "./admin.module.css";

type AdminOrder = {
  id: string;
  orderNumber: string;
  email: string;
  items: OrderLine[];
  address: ShippingAddress;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  createdAt: string | Date;
};

type Draft = Omit<Product, "id">;

const blankDraft: Draft = {
  name: "", description: "", department: "men", category: "", price: 0,
  originalPrice: null, image: "", color: "", colorHex: "#222222", sizes: [],
  badge: null, featured: false, isActive: true,
};

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
const date = (value: string | Date) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AdminConsole({ adminName }: { adminName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sizesText, setSizesText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    const [productResponse, orderResponse] = await Promise.all([fetch("/api/admin/products"), fetch("/api/admin/orders")]);
    if (productResponse.status === 401 || orderResponse.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const [productData, orderData] = await Promise.all([productResponse.json(), orderResponse.json()]);
    if (!productResponse.ok || !orderResponse.ok) throw new Error(productData.error || orderData.error || "Unable to load admin data.");
    setProducts(productData.products);
    setOrders(orderData.orders);
  }

  useEffect(() => {
    loadData().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load admin data."));
  }, []);

  function startEdit(product: Product) {
    const { id, ...productDraft } = product;
    setEditingId(id);
    setDraft(productDraft);
    setSizesText(product.sizes.join(", "));
    setTab("products");
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(blankDraft);
    setSizesText("");
  }

  function setField<Key extends keyof Draft>(field: Key, value: Draft[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const payload = { ...draft, sizes: sizesText.split(",").map((size) => size.trim()).filter(Boolean) };
    try {
      const response = await fetch(editingId ? `/api/admin/products/${encodeURIComponent(editingId)}` : "/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");
      await loadData();
      resetForm();
      setMessage(editingId ? "Product updated." : "Product added.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save product.");
    } finally {
      setBusy(false);
    }
  }

  async function changeActive(product: Product) {
    const confirmed = product.isActive ? window.confirm(`Remove ${product.name} from the storefront?`) : true;
    if (!confirmed) return;
    setError("");
    try {
      if (product.isActive) {
        const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Unable to remove product.");
      } else {
        const { id, ...productDraft } = product;
        const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...productDraft, isActive: true }) });
        if (!response.ok) throw new Error("Unable to restore product.");
      }
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to change product status.");
    }
  }

  async function changeOrderStatus(order: AdminOrder, status: AdminOrderStatus) {
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update order.");
      setOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update order.");
    }
  }

  async function signOut() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  const activeProducts = products.filter((product) => product.isActive).length;
  const revenue = orders.reduce((total, order) => total + order.total, 0);

  return <main className={styles.adminPage}>
    <header className={styles.topbar}>
      <a className={styles.brand} href="/">NIKHATU <span>ADMIN</span></a>
      <div className={styles.topActions}><span>Signed in as <strong>{adminName}</strong></span><button className={styles.textButton} onClick={signOut}><LogOut size={15} /> Sign out</button></div>
    </header>
    <div className={styles.content}>
      <div className={styles.headingRow}><div><p className={styles.eyebrow}>STORE OPERATIONS</p><h1>Dashboard</h1></div><span className={styles.secureLabel}><Check size={14} /> Private admin session</span></div>
      <section className={styles.metrics} aria-label="Store summary">
        <div className={styles.metric}><Box size={18} /><span>Active products</span><strong>{activeProducts}</strong></div>
        <div className={styles.metric}><ShoppingBag size={18} /><span>Total orders</span><strong>{orders.length}</strong></div>
        <div className={styles.metric}><CircleDollarSign size={18} /><span>Order value</span><strong>{money(revenue)}</strong></div>
      </section>
      <nav className={styles.tabs} aria-label="Admin sections">
        <button className={tab === "products" ? styles.activeTab : ""} onClick={() => setTab("products")}><Box size={16} /> Products <span>{products.length}</span></button>
        <button className={tab === "orders" ? styles.activeTab : ""} onClick={() => setTab("orders")}><Package size={16} /> Orders <span>{orders.length}</span></button>
      </nav>
      {(message || error) && <p className={error ? styles.error : styles.success} role="status">{error || message}</p>}

      {tab === "products" ? <div className={styles.productLayout}>
        <section className={styles.formSection}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{editingId ? "PRODUCT DETAILS" : "NEW ITEM"}</p><h2>{editingId ? "Edit product" : "Add product"}</h2></div>{editingId && <button className={styles.iconButton} onClick={resetForm} aria-label="Cancel editing"><X size={17} /></button>}</div>
          <form className={styles.productForm} onSubmit={saveProduct}>
            <label className={styles.full}>Product name<input required maxLength={160} value={draft.name} onChange={(event) => setField("name", event.target.value)} /></label>
            <label className={styles.full}>Description<textarea required maxLength={4000} rows={4} value={draft.description} onChange={(event) => setField("description", event.target.value)} /></label>
            <label>Department<select value={draft.department} onChange={(event) => setField("department", event.target.value)}><option value="men">Men</option><option value="women">Women</option><option value="kids">Kids</option></select></label>
            <label>Category<input required maxLength={80} value={draft.category} onChange={(event) => setField("category", event.target.value)} /></label>
            <label>Price (₹)<input required type="number" min="1" step="1" value={draft.price || ""} onChange={(event) => setField("price", Number(event.target.value))} /></label>
            <label>Original price (₹)<input type="number" min="0" step="1" value={draft.originalPrice ?? ""} onChange={(event) => setField("originalPrice", event.target.value === "" ? null : Number(event.target.value))} /></label>
            <label className={styles.full}>Image URL<input required type="text" maxLength={2048} placeholder="https://... or /images/..." value={draft.image} onChange={(event) => setField("image", event.target.value)} /></label>
            <label>Color<input required maxLength={80} value={draft.color} onChange={(event) => setField("color", event.target.value)} /></label>
            <label>Color hex<input required type="color" value={draft.colorHex} onChange={(event) => setField("colorHex", event.target.value)} /></label>
            <label className={styles.full}>Sizes <small>Comma-separated</small><input required maxLength={800} placeholder="XS, S, M, L" value={sizesText} onChange={(event) => setSizesText(event.target.value)} /></label>
            <label className={styles.full}>Badge<input maxLength={40} placeholder="BESTSELLER" value={draft.badge ?? ""} onChange={(event) => setField("badge", event.target.value || null)} /></label>
            <div className={styles.toggleRow}><label><input type="checkbox" checked={draft.featured} onChange={(event) => setField("featured", event.target.checked)} /> Featured</label><label><input type="checkbox" checked={draft.isActive} onChange={(event) => setField("isActive", event.target.checked)} /> Visible in store</label></div>
            <button className={styles.primaryButton} disabled={busy}>{busy ? "Saving..." : <><Save size={16} /> {editingId ? "Save changes" : "Add product"}</>}</button>
          </form>
        </section>
        <section className={styles.listSection}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>CATALOGUE</p><h2>Products <span>{products.length}</span></h2></div></div>
          <div className={styles.productList}>{products.map((product) => <article className={`${styles.productRow} ${!product.isActive ? styles.inactiveRow : ""}`} key={product.id}>
            <img src={product.image} alt="" />
            <div className={styles.productSummary}><strong>{product.name}</strong><span>{product.department} / {product.category} · {money(product.price)}{product.badge ? ` · ${product.badge}` : ""}</span>{!product.isActive && <small>Hidden from storefront</small>}</div>
            {product.featured && <span className={styles.featuredLabel}>Featured</span>}
            <div className={styles.rowActions}><button className={styles.iconButton} onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`} title="Edit"><Save size={16} /></button><button className={styles.iconButton} onClick={() => changeActive(product)} aria-label={`${product.isActive ? "Remove" : "Restore"} ${product.name}`} title={product.isActive ? "Remove from store" : "Restore to store"}>{product.isActive ? <Trash2 size={16} /> : <ArrowDownToLine size={16} />}</button></div>
          </article>)}</div>
        </section>
      </div> : <section className={styles.ordersSection}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>FULFILMENT</p><h2>Orders <span>{orders.length}</span></h2></div></div>
        {orders.length === 0 ? <p className={styles.empty}>No orders yet.</p> : <div className={styles.orderList}>{orders.map((order) => <article className={styles.order} key={order.id}>
          <div className={styles.orderHeader}><div><strong>{order.orderNumber}</strong><span>{date(order.createdAt)} · {order.email}</span></div><strong>{money(order.total)}</strong></div>
          <div className={styles.orderDetails}><div><h3>Items</h3>{order.items.map((item, index) => <p key={`${item.productId}-${item.size}-${index}`}>{item.quantity} × {item.name} / {item.size} · {money(item.price)}</p>)}</div><div><h3>Ship to</h3><p>{order.address.name}, {order.address.phone}</p><p>{order.address.line1}, {order.address.city}, {order.address.state} {order.address.pincode}</p></div><label className={styles.statusSelect}>Status<select value={orderStatuses.includes(order.status as AdminOrderStatus) ? order.status : "confirmed"} onChange={(event) => changeOrderStatus(order, event.target.value as AdminOrderStatus)}><ChevronDown size={14} />{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div>
        </article>)}</div>}
      </section>}
      <footer className={styles.footer}>NIKHATU ADMIN <span>Products are hidden, not erased, when removed.</span></footer>
    </div>
  </main>;
}