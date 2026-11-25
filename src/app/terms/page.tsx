import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of Service – Wayfarers" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 24, 2026">
      <p>
        Wayfarers is a free, hobby project for planning trips with friends. By using it, you agree to these simple
        terms.
      </p>

      <h2>Using the app</h2>
      <ul>
        <li>Be respectful. Don&apos;t post anything illegal, abusive, or that you don&apos;t have the right to share.</li>
        <li>Don&apos;t try to access trips you weren&apos;t invited to, or attempt to disrupt or overload the service.</li>
        <li>You&apos;re responsible for the content you add. Trip leaders may remove content or members from their trips.</li>
      </ul>

      <h2>No guarantees</h2>
      <p>
        The app is provided &quot;as is&quot;, without warranties of any kind. It may change, have bugs, lose data, or go
        offline at any time. Always double-check prices, availability, and details on the original booking sites
        before you book anything. The maintainer isn&apos;t liable for any losses from using the app.
      </p>

      <h2>Third-party links</h2>
      <p>
        Places and housing entries link to other websites (like Airbnb or Booking.com). Those sites have their own
        terms, and Wayfarers isn&apos;t affiliated with them.
      </p>

      <h2>Ending access</h2>
      <p>
        You can stop using the app at any time. Access may be removed for anyone who misuses it. See the{" "}
        <Link className="underline" href="/privacy">Privacy Policy</Link> for how to have your data deleted.
      </p>
    </LegalPage>
  );
}
