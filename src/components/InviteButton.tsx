"use client";
import { useState } from "react";

export function InviteButton({ inviteCode, className = "btn btn-primary" }: { inviteCode: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      {copied ? "✓ Link copied!" : "🔗 Invite friends"}
    </button>
  );
}
