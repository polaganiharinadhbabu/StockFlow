"use client";
import { useEffect, useState } from "react";
import { api, toast } from "@/lib/api";

export default function Settings() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setS(await api("/settings"));
    } catch (e) {
      toast(e.message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  if (loading) return <p className="muted">Loading settings…</p>;
  if (!s) {
    return (
      <section className="card empty-state">
        <p>We couldn’t load your settings.</p>
        <button className="btn" onClick={load}>Try again</button>
      </section>
    );
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      setS(await api("/settings", "PUT", { default_threshold: Number(e.currentTarget.t.value) }));
      toast("Settings saved");
    } catch (x) {
      toast(x.message, true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Settings</h1>
      <p className="muted">Rules that apply to your whole organization.</p>
      <form className="card narrow" onSubmit={save} style={{ marginTop: 20 }}>
        <p className="muted">Organization: <b>{s.org_name}</b></p>
        <label>Default low stock threshold<input name="t" type="number" min="0" step="1" required defaultValue={s.default_threshold} /></label>
        <p className="muted">Used for products that have no threshold of their own.</p>
        <button className="btn" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
      </form>
    </>
  );
}
