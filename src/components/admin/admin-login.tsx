"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import styles from "./admin.module.css";

export default function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to sign in.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.loginPage}>
    <div className={styles.loginPanel}>
      <Link className={styles.backLink} href="/"><ArrowLeft size={15} /> Storefront</Link>
      <div className={styles.loginMark}><LockKeyhole size={19} /><span>NIKHATU / ADMIN</span></div>
      <h1>Sign in.</h1>
      <p>Use your administrator account to continue.</p>
      <form className={styles.loginForm} onSubmit={signIn}>
        <label>Email address<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required /></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primaryButton} disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  </main>;
}