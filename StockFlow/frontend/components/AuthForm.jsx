"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, session } from "@/lib/api";
import PasswordInput from "./PasswordInput";

// One form used by both the Login page and the Signup page.
export default function AuthForm({ mode }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    setError("");
    if (signup && !f.org_name.trim()) return setError("Enter your organization name");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Enter a valid email address, for example name@example.com");
    if (signup && f.password.length < 8) return setError("Password must be at least 8 characters");
    if (!signup && !f.password) return setError("Enter your password");
    if (signup && f.password !== f.confirm) return setError("Passwords do not match");
    setSubmitting(true);
    try {
      const r = await api(signup ? "/auth/signup" : "/auth/login", "POST", { email: f.email.trim(), password: f.password, org_name: f.org_name });
      session.set(r.token);
      router.push("/dashboard");
    } catch (x) {
      setError(x.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <div className="hero">
        <div className="brand">StockFlow</div>
        <h1>Inventory control for growing businesses</h1>
        <p>Track products, stock levels and low-stock items in one place.</p>
        <ul><li>A separate workspace for every organization</li><li>Stock adjustments with notes</li><li>Automatic low-stock monitoring</li></ul>
      </div>
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h2>{signup ? "Create your account" : "Welcome back"}</h2>
        {signup && <label>Organization name<input name="org_name" maxLength={120} placeholder="My Test Store" autoComplete="organization" /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" /></label>
        <label>Password<PasswordInput name="password" autoComplete={signup ? "new-password" : "current-password"} /></label>
        {signup && <label>Confirm password<PasswordInput name="confirm" autoComplete="new-password" /></label>}
        <p className="error" role="alert">{error}</p>
        <button className="btn" disabled={submitting}>{submitting ? "Please wait…" : signup ? "Sign up" : "Log in"}</button>
        <p className="switch">{signup ? "Already have an account?" : "New here?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create account"}</Link></p>
      </form>
    </div>
  );
}
