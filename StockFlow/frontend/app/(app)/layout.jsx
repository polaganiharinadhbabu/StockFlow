"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, session, toast } from "@/lib/api";

const NAV = [["/dashboard", "Dashboard"], ["/products", "Products"], ["/settings", "Settings"]];

// The sidebar and the "must be logged in" check for every page inside the app.
export default function AppLayout({ children }) {
  const router = useRouter();
  const path = usePathname();
  const [org, setOrg] = useState("");

  useEffect(() => {
    if (!session.get()) return router.replace("/login");
    api("/settings")
      .then((s) => setOrg(s.org_name))
      .catch((e) => toast(e.message, true));
  }, [router]);

  function signOut() {
    session.set(null);
    router.replace("/login");
  }

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand">StockFlow</div>
        <div className="org">{org}</div>
        <nav aria-label="Main navigation">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "on" : ""} aria-current={path === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <button className="signout" onClick={signOut}>Sign out</button>
      </aside>
      <main>{children}</main>
    </div>
  );
}
