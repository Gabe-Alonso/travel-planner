import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 py-4 text-center text-xs text-stone-500">
      <span>Wayfarers © 2026</span>
      <span className="mx-2" aria-hidden>·</span>
      <Link href="/privacy" className="hover:text-stone-800 hover:underline">
        Privacy Policy
      </Link>
      <span className="mx-2" aria-hidden>·</span>
      <Link href="/terms" className="hover:text-stone-800 hover:underline">
        Terms of Service
      </Link>
    </footer>
  );
}
