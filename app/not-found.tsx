import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <span aria-hidden="true">✺</span>
      <p className="eyebrow">404 · Off the path</p>
      <h1>This patch hasn&apos;t been planted.</h1>
      <Link className="button button-sun" href="/">Return to Perfect Prairie</Link>
    </main>
  );
}
