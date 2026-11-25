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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!session.get()) return router.replace("/login");
    api("/settings")
      .then((s) => setOrg(s.org_name))
      .catch((e) => toast(e.message, true));
  }, [router]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 861px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function signOut() {
    session.set(null);
    setMobileMenuOpen(false);
    router.replace("/login");
  }

  return (
    <div className="layout">
      <header className="mobile-header">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className="menu-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <span className="mobile-brand">StockFlow</span>
        {org && <span className="mobile-org" title={org}>{org}</span>}
      </header>
      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside id="app-sidebar" className={`side${mobileMenuOpen ? " mobile-open" : ""}`}>
        <div className="brand">StockFlow</div>
        <div className="org">{org}</div>
        <nav id="app-navigation" aria-label="Main navigation">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "on" : ""}
              aria-current={path === href ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button className="signout" onClick={signOut}>Log out</button>
      </aside>
      <main>{children}</main>
    </div>
  );
}
