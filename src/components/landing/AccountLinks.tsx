"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { cn, secondaryBtn } from "@/components/ui";

/** Header account links: "Sign in" for visitors, a way back to the dashboard for signed-in users. */
export function HeaderAccountLink() {
  const app = useApp();
  if (app.ready && app.user) {
    return (
      <Link href="/dashboard" className={cn(secondaryBtn, "px-3 py-1.5")}>
        Dashboard <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    );
  }
  return (
    <Link href="/signup?mode=signin" className="px-1 text-sm text-slate-300 hover:text-white">
      Sign in
    </Link>
  );
}

/** The secondary call to action beside "Try the demo": sign up, or open the dashboard when already signed in. */
export function AccountCta({ className }: { className?: string }) {
  const app = useApp();
  const signedIn = app.ready && !!app.user;
  return (
    <Link href={signedIn ? "/dashboard" : "/signup"} className={cn(secondaryBtn, className)}>
      {signedIn ? "Open your dashboard" : "Create an account"} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
