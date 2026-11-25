// Start the API first (npm run dev), then run: npm test
const test = require("node:test");
const assert = require("node:assert");

const BASE = process.env.BASE_URL || "http://localhost:4000/api";
const run = Date.now();

async function call(path, method = "GET", body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const signup = async (name) => (await call("/auth/signup", "POST", { email: `${name}${run}@test.com`, password: "password123", org_name: name })).data.token;
const item = (sku, extra = {}) => ({ name: "Pen", sku, quantity: 10, ...extra });

test("login works and a wrong password is rejected", async () => {
  await signup("login");
  assert.equal((await call("/auth/login", "POST", { email: `login${run}@test.com`, password: "password123" })).status, 200);
  assert.equal((await call("/auth/login", "POST", { email: `login${run}@test.com`, password: "wrong-pass" })).status, 401);
});

test("protected routes reject missing or malformed bearer tokens", async () => {
  assert.equal((await call("/products")).status, 401);
  const res = await fetch(BASE + "/products", { headers: { Authorization: "Basic not-a-token" } });
  assert.equal(res.status, 401);
});

test("SKU is unique inside one organization only", async () => {
  const [a, b] = [await signup("sku1"), await signup("sku2")];
  assert.equal((await call("/products", "POST", item("A1"), a)).status, 201);
  assert.equal((await call("/products", "POST", item("a1"), a)).status, 409);
  assert.equal((await call("/products", "POST", item("A1"), b)).status, 201);
});

test("negative quantity is rejected", async () => {
  assert.equal((await call("/products", "POST", item("N1", { quantity: -1 }), await signup("neg"))).status, 422);
});

test("organizations cannot see or delete each other's products", async () => {
  const [a, b] = [await signup("iso1"), await signup("iso2")];
  const { data } = await call("/products", "POST", item("X1"), a);
  assert.deepEqual((await call("/products", "GET", null, b)).data, []);
  assert.equal((await call("/products/" + data.id, "DELETE", null, b)).status, 404);
});

test("low stock uses the default, and a threshold of 0 overrides it", async () => {
  const t = await signup("low");
  await call("/products", "POST", item("LOW", { quantity: 5 }), t);
  await call("/products", "POST", item("ZERO", { quantity: 0, low_stock_threshold: 0 }), t);
  await call("/products", "POST", item("FINE", { quantity: 9 }), t);
  const { data } = await call("/dashboard", "GET", null, t);
  assert.deepEqual(data.low_stock.map((p) => p.sku).sort(), ["LOW", "ZERO"]);
});

test("stock adjustment, floor at zero, and case-insensitive search", async () => {
  const t = await signup("adj");
  const { data } = await call("/products", "POST", item("PEN-1"), t);
  assert.equal((await call(`/products/${data.id}/adjust`, "POST", { delta: -4, note: "sold" }, t)).data.quantity, 6);
  assert.equal((await call(`/products/${data.id}/adjust`, "POST", { delta: -50 }, t)).status, 422);
  assert.equal((await call("/products?q=pen-1", "GET", null, t)).data.length, 1);
});
