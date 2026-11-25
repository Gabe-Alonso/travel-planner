import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy – Wayfarers" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 24, 2026">
      <p>
        Wayfarers is a small, non-commercial app for planning trips with friends. This page explains what
        information it stores and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account info:</strong> your name, email address, and profile picture. If you sign in with Google
          or Facebook, these come from that account. Nothing else is requested from Google or Facebook.
        </li>
        <li>
          <strong>Trip content:</strong> the trips you create or join, destinations you suggest, your votes, and the
          places, housing links, and notes you add.
        </li>
      </ul>

      <h2>How it is used</h2>
      <p>
        Your information is used only to run the app: signing you in, and showing your name, picture, votes, and
        contributions to the other members of trips you belong to. It is never sold, shared with advertisers, or used
        for marketing. There are no ads or tracking cookies; the only cookies are the ones that keep you signed in.
      </p>

      <h2>Where it is stored</h2>
      <p>
        Data is stored with <a className="underline" href="https://supabase.com/privacy">Supabase</a> (database and
        authentication) and the app is hosted on <a className="underline" href="https://vercel.com/legal/privacy-policy">Vercel</a>.
        When you paste a link, the app fetches that page once to grab its title and preview image. City photos are
        loaded from Wikipedia.
      </p>

      <h2>Who can see your data</h2>
      <p>
        Only members of a trip can see that trip and its contents. Other users can see your name and profile picture
        only if you share a trip with them.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can leave a trip or remove anything you added at any time. To have your account and all associated data
        deleted, contact the app&apos;s maintainer (the person who shared the app with you) and it will be removed.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top of this page will be updated.</p>
    </LegalPage>
  );
}
