// Small helpers shared by every page.
export const session = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem("sf_token")),
  set: (token) => (token ? localStorage.setItem("sf_token", token) : localStorage.removeItem("sf_token")),
};

// Calls the backend and adds the login token. Throws an Error with a readable message.
export async function api(path, method = "GET", body) {
  const token = session.get();
  const hasBody = body !== undefined;
  const res = await fetch("/api" + path, {
    method,
    headers: {
      ...(hasBody && { "Content-Type": "application/json" }),
      ...(token && { Authorization: "Bearer " + token }),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { session.set(null); window.location.href = "/login"; }
    throw new Error(data.detail || "Something went wrong");
  }
  return data;
}

export const money = (v) => (v === null || v === undefined ? "—" : "₹" + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 }));
export const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function toast(message, bad) {
  const el = document.createElement("div");
  el.className = "toast" + (bad ? " bad" : "");
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3000);
}
