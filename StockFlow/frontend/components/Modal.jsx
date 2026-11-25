"use client";
import { useState } from "react";

// A pop-up form. onSubmit gets the form values; if it throws, the message is shown inside the pop-up.
export default function Modal({ title, children, onSubmit, onClose }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (x) {
      setError(x.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay">
      <form className="card dlg" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        {children}
        <p className="error" role="alert">{error}</p>
        <div className="row">
          <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
