import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return <main className="fallback-page"><Link className="header-wordmark" href="/">NIKHATU<span className="wordmark-period">®</span></Link><span className="eyebrow">A LITTLE OFF THE BEATEN PATH / 404</span><h1>Find your<br />way back.</h1><p>This page is not part of the collection.<br />But your next favourite is waiting.</p><Link className="button button-dark" href="/shop">EXPLORE THE COLLECTION <ArrowRight size={16} /></Link><Link className="underlined-link" href="/">BACK TO HOME</Link></main>;
}
