"use client";
import { useCallback, useEffect, useState } from "react";
import { api, money, when, toast } from "@/lib/api";
import Modal from "@/components/Modal";

const num = (x) => (x === "" ? null : Number(x)); // an empty box means "no value"

export default function Products() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState(null); // { type: "form" | "adjust", product }
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setProducts(await api("/products?q=" + encodeURIComponent(q)));
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      toast(e.message, true);
    }
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function saveProduct(f) {
    const p = dialog.product;
    await api(p ? "/products/" + p.id : "/products", p ? "PUT" : "POST", {
      name: f.name, sku: f.sku, description: f.description || null, quantity: Number(f.quantity),
      cost_price: num(f.cost_price), selling_price: num(f.selling_price), low_stock_threshold: num(f.low_stock_threshold),
    });
    toast(p ? "Product updated" : "Product added");
    setDialog(null);
    load();
  }

  async function saveAdjust(f) {
    await api(`/products/${dialog.product.id}/adjust`, "POST", { delta: Number(f.delta), note: f.note });
    toast("Stock updated");
    setDialog(null);
    load();
  }

  async function remove(p) {
    if (!confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
    try { await api("/products/" + p.id, "DELETE"); toast("Product deleted"); load(); } catch (e) { toast(e.message, true); }
  }

  const p = dialog?.product;
  return (
    <>
      <div className="bar">
        <h1>Products</h1>
        <input type="search" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => setDialog({ type: "form", product: null })}>+ Add product</button>
      </div>

      <section className="card scroll">
        {status === "loading" ? (
          <p className="muted empty-state">Loading products…</p>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="muted">Products couldn’t be loaded.</p>
            <button className="btn" onClick={load}>Try again</button>
          </div>
        ) : products.length ? (
          <table>
            <thead><tr><th>Name</th><th>SKU</th><th>Quantity</th><th>Status</th><th>Selling price</th><th>Last updated</th><th></th></tr></thead>
            <tbody>
              {products.map((x) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td><code>{x.sku}</code></td>
                  <td>{x.quantity}</td>
                  <td><span className={"badge " + (x.low_stock ? "low" : "ok")}>{x.low_stock ? "Low stock" : "In stock"}</span></td>
                  <td>{money(x.selling_price)}</td>
                  <td>{when(x.updated_at)}<span className="by">{x.last_updated_by}</span></td>
                  <td className="acts">
                    <button className="btn sm" onClick={() => setDialog({ type: "adjust", product: x })}>Adjust stock</button>
                    <button className="btn sm" onClick={() => setDialog({ type: "form", product: x })}>Edit</button>
                    <button className="btn sm danger" onClick={() => remove(x)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted empty-state">{q ? `No products match “${q}”. Try a different name or SKU.` : "No products yet. Click “Add product” to create one."}</p>
        )}
      </section>

      {dialog?.type === "form" && (
        <Modal title={p ? "Edit product" : "Add product"} onSubmit={saveProduct} onClose={() => setDialog(null)}>
          <label>Name*<input name="name" required maxLength={200} defaultValue={p?.name ?? ""} /></label>
          <label>SKU*<input name="sku" required maxLength={80} defaultValue={p?.sku ?? ""} /></label>
          <label>Description<input name="description" defaultValue={p?.description ?? ""} /></label>
          <div className="grid2">
            <label>Quantity on hand*<input name="quantity" type="number" min="0" step="1" required defaultValue={p?.quantity ?? 0} /></label>
            <label>Low stock threshold<input name="low_stock_threshold" type="number" min="0" step="1" placeholder="Use default" defaultValue={p?.low_stock_threshold ?? ""} /></label>
            <label>Cost price<input name="cost_price" type="number" min="0" step="0.01" defaultValue={p?.cost_price ?? ""} /></label>
            <label>Selling price<input name="selling_price" type="number" min="0" step="0.01" defaultValue={p?.selling_price ?? ""} /></label>
          </div>
        </Modal>
      )}

      {dialog?.type === "adjust" && (
        <Modal title={"Adjust stock: " + p.name} onSubmit={saveAdjust} onClose={() => setDialog(null)}>
          <p className="muted">Currently {p.quantity} units. Use a minus sign to remove stock.</p>
          <label>Change (+/- units)<input name="delta" type="number" step="1" required placeholder="e.g. 10 or -3" /></label>
          <label>Note<input name="note" maxLength={200} placeholder="e.g. New delivery" /></label>
        </Modal>
      )}
    </>
  );
}
