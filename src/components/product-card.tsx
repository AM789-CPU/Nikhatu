"use client";

import { ArrowRight, Heart } from "lucide-react";
import { type Product, formatPrice } from "@/lib/products";

export function ProductCard({ product, saved, onOpen, onSave }: { product: Product; saved: boolean; onOpen: (product: Product) => void; onSave: (id: string) => void }) {
  return <article className="product-card">
    <div className="product-image-wrap">
      <button className="product-image-button" onClick={() => onOpen(product)} aria-label={`View ${product.name}`}><img src={product.image} alt={`${product.name} in ${product.color}`} loading="lazy" />{(product.image.includes("/images/classic/") || product.image.includes("/images/monster/collection/")) && <img className="product-image-alt" src={product.image.replace(/\.jpg$/, "-2.jpg")} alt="" aria-hidden="true" loading="lazy" />}</button>
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <button className={`save-product ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} onClick={() => onSave(product.id)}><Heart size={19} fill={saved ? "currentColor" : "none"} strokeWidth={1.4} /></button>
      <button className="quick-add" onClick={() => onOpen(product)}>QUICK ADD <ArrowRight size={15} /></button>
    </div>
    <div className="product-information"><div className="product-meta"><span>{product.department.toUpperCase()} / {product.category.toUpperCase()}</span><span className="color-dot" style={{ backgroundColor: product.colorHex }} title={product.color} /></div><button className="product-name" onClick={() => onOpen(product)}>{product.name}</button><div className="product-price"><span>{formatPrice(product.price)}</span>{product.originalPrice && <del>{formatPrice(product.originalPrice)}</del>}<span className="tax-note">incl. taxes</span></div></div>
  </article>;
}
