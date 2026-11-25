"use client";
import { useCallback, useEffect, useState } from "react";
import { api, toast } from "@/lib/api";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setD(await api("/dashboard"));
    } catch (e) {
      toast(e.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !d) return <p className="muted">Loading dashboard…</p>;
  if (!d) {
    return (
      <section className="card empty-state">
        <p>We couldn’t load your dashboard.</p>
        <button className="btn" onClick={load}>Try again</button>
      </section>
    );
  }

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">A quick summary of your inventory.</p>
      <div className="stats">
        <div className="stat c1"><span>Total products</span><b>{d.total_products}</b><small>Items in your catalogue</small></div>
        <div className="stat c2"><span>Units in stock</span><b>{d.total_units}</b><small>Total quantity on hand</small></div>
        <div className="stat c3"><span>Low stock items</span><b>{d.low_stock.length}</b><small>At or below their threshold</small></div>
      </div>
      <section className="card">
        <h2>Low stock items</h2>
        {loading ? <p className="muted">Refreshing inventory…</p> : d.low_stock.length ? (
          <div className="scroll">
            <table>
              <thead><tr><th>Name</th><th>SKU</th><th>Quantity on hand</th><th>Low stock threshold</th></tr></thead>
              <tbody>
                {d.low_stock.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td><code>{p.sku}</code></td><td><span className="badge low">{p.quantity}</span></td><td>{p.threshold}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">All products are above their low stock threshold.</p>}
      </section>
    </>
  );
}
