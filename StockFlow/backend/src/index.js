// StockFlow API: Express, Prisma, PostgreSQL, and JWT authentication.
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");

const prisma = new PrismaClient();
const app = express();
const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET.length < 32) {
  console.error("Set JWT_SECRET (32+ characters) in backend/.env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const price = z.number().min(0, "Prices cannot be negative").nullable().optional();
const rules = {
  signup: z.object({
    email,
    password: z.string().min(8, "Password must be at least 8 characters"),
    org_name: z.string().trim().min(1, "Enter your organization name").max(120),
  }),
  login: z.object({ email, password: z.string().min(1, "Enter your password") }),
  product: z.object({
    name: z.string().trim().min(1, "Name is required").max(200),
    sku: z.string().trim().min(1, "SKU is required").max(80),
    description: z.string().trim().nullable().optional(),
    quantity: z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative"),
    cost_price: price,
    selling_price: price,
    low_stock_threshold: z.number().int("Threshold must be a whole number").min(0, "Threshold cannot be negative").nullable().optional(),
  }),
  adjust: z.object({
    delta: z.number().int("Enter a whole number"),
    note: z.string().trim().max(200).default(""),
  }),
  settings: z.object({
    default_threshold: z.number().int("Enter a whole number").min(0, "Cannot be negative"),
  }),
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function check(rule, data) {
  const result = rules[rule].safeParse(data);
  if (!result.success) throw new HttpError(422, result.error.issues[0].message);
  return result.data;
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sign = (user) => jwt.sign({ sub: user.id }, SECRET, { expiresIn: "1d" });

const auth = wrap(async (req, res, next) => {
  const header = req.get("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  let payload;

  try {
    if (!token) throw new Error("Missing bearer token");
    payload = jwt.verify(token, SECRET);
  } catch {
    throw new HttpError(401, "Please sign in again");
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    include: { org: true },
  });
  if (!user) throw new HttpError(401, "Please sign in again");

  req.user = user;
  next();
});

async function myProduct(req) {
  const id = Number(req.params.id);
  const product = Number.isInteger(id)
    ? await prisma.product.findFirst({ where: { id, orgId: req.user.orgId } })
    : null;
  if (!product) throw new HttpError(404, "Product not found");
  return product;
}

function show(product, defaultThreshold) {
  const threshold = product.lowStockThreshold ?? defaultThreshold;
  const money = (value) => (value === null ? null : Number(value));

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    quantity: product.quantity,
    cost_price: money(product.costPrice),
    selling_price: money(product.sellingPrice),
    low_stock_threshold: product.lowStockThreshold,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    last_updated_by: product.lastUpdatedBy,
    threshold,
    low_stock: product.quantity <= threshold,
  };
}

const toDb = (data) => ({
  name: data.name,
  sku: data.sku.toUpperCase(),
  description: data.description || null,
  quantity: data.quantity,
  costPrice: data.cost_price ?? null,
  sellingPrice: data.selling_price ?? null,
  lowStockThreshold: data.low_stock_threshold ?? null,
});

app.get("/api/health", wrap(async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, database: "connected" });
}));

app.post("/api/auth/signup", wrap(async (req, res) => {
  const data = check("signup", req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, "Email already registered");
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      org: { create: { name: data.org_name } },
    },
  });
  res.json({ token: sign(user) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const data = check("login", req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new HttpError(401, "Wrong email or password");
  }
  res.json({ token: sign(user) });
}));

app.get("/api/products", auth, wrap(async (req, res) => {
  const query = String(req.query.q || "").trim();
  const search = query
    ? { OR: [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ] }
    : {};
  const products = await prisma.product.findMany({
    where: { orgId: req.user.orgId, ...search },
    orderBy: { name: "asc" },
  });
  res.json(products.map((product) => show(product, req.user.org.defaultThreshold)));
}));

app.post("/api/products", auth, wrap(async (req, res) => {
  const data = {
    ...toDb(check("product", req.body)),
    orgId: req.user.orgId,
    lastUpdatedBy: req.user.email,
  };
  const product = await prisma.product.create({ data });
  res.status(201).json(show(product, req.user.org.defaultThreshold));
}));

app.put("/api/products/:id", auth, wrap(async (req, res) => {
  const product = await myProduct(req);
  const data = {
    ...toDb(check("product", req.body)),
    lastUpdatedBy: req.user.email,
  };
  const updated = await prisma.product.update({ where: { id: product.id }, data });
  res.json(show(updated, req.user.org.defaultThreshold));
}));

app.delete("/api/products/:id", auth, wrap(async (req, res) => {
  const product = await myProduct(req);
  await prisma.product.delete({ where: { id: product.id } });
  res.json({ ok: true });
}));

app.post("/api/products/:id/adjust", auth, wrap(async (req, res) => {
  const product = await myProduct(req);
  const { delta, note } = check("adjust", req.body);
  if (product.quantity + delta < 0) throw new HttpError(422, "Stock cannot go below zero");

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      quantity: { increment: delta },
      lastUpdatedBy: note ? `${req.user.email}: ${note}` : req.user.email,
    },
  });
  res.json(show(updated, req.user.org.defaultThreshold));
}));

app.get("/api/dashboard", auth, wrap(async (req, res) => {
  const found = await prisma.product.findMany({
    where: { orgId: req.user.orgId },
    orderBy: { quantity: "asc" },
  });
  const products = found.map((product) => show(product, req.user.org.defaultThreshold));
  res.json({
    total_products: products.length,
    total_units: products.reduce((sum, product) => sum + product.quantity, 0),
    low_stock: products.filter((product) => product.low_stock),
  });
}));

app.get("/api/settings", auth, (req, res) => {
  res.json({
    org_name: req.user.org.name,
    default_threshold: req.user.org.defaultThreshold,
  });
});

app.put("/api/settings", auth, wrap(async (req, res) => {
  const data = check("settings", req.body);
  const org = await prisma.organization.update({
    where: { id: req.user.orgId },
    data: { defaultThreshold: data.default_threshold },
  });
  res.json({ org_name: org.name, default_threshold: org.defaultThreshold });
}));

app.use((err, req, res, next) => {
  const send = (status, detail) => res.status(status).json({ detail });

  if (err.code === "P2002") {
    const target = err.meta?.target || [];
    if (target.includes("email")) return send(409, "Email already registered");
    if (target.includes("sku")) return send(409, "SKU already exists in your organization");
    return send(409, "A record with these details already exists");
  }
  if (err instanceof HttpError) return send(err.status, err.message);
  if (err.type === "entity.parse.failed") return send(400, "Invalid request");
  if (
    err.name === "PrismaClientInitializationError"
    || ["P1000", "P1001", "P1002", "P1003", "P1017"].includes(err.errorCode)
  ) {
    console.error("Database unavailable. Check backend/.env DATABASE_URL and PostgreSQL connectivity.");
    return send(503, "Database unavailable. Check DATABASE_URL and ensure PostgreSQL is reachable.");
  }

  console.error(err);
  send(500, "Something went wrong on the server");
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`StockFlow API running on http://localhost:${port}`));
