"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ErrorPage({ error, reset }: { error?: Error & { digest?: string }; reset: () => void }) {
  if (typeof window !== "undefined" && error) console.error("NIKHATU error:", error);
  return <main className="fallback-page"><Link className="header-wordmark" href="/">NIKHATU<span className="wordmark-period">®</span></Link><span className="eyebrow">JUST A LITTLE PAUSE</span><h1>Good things<br />take a moment.</h1><p>This page could not load right now.<br />Please try again. We will be right here.</p><button className="button button-dark" onClick={reset}>TRY AGAIN <ArrowRight size={16} /></button><Link className="underlined-link" href="/">BACK TO HOME</Link>{error && <small style={{ marginTop: 18, maxWidth: 560, opacity: 0.55, fontSize: 11, wordBreak: "break-word" }}>Debug: {error.message}{error.digest ? ` (digest ${error.digest})` : ""}</small>}</main>;
}
