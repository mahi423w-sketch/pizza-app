const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Correct folder names for Linux servers (Render)
const DATA_DIR = path.join(__dirname, "Data"); // Capital D
const MENU_FILE = path.join(DATA_DIR, "menu.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "Public"))); // Capital P

// Ensure Data folder exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creating Data folder:", err);
  }
}

async function readJson(filePath, defaultValue) {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
}

async function writeJson(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/* ---------- FRONTEND ROUTES (Important!) ---------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "admin-login.html"));
});

app.get("/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "orders.html"));
});

/* ---------- API: MENU ---------- */
app.get("/api/menu", async (req, res) => {
  try {
    const menu = await readJson(MENU_FILE, []);
    res.json(menu);
  } catch {
    res.status(500).json({ error: "Menu load error" });
  }
});

app.post("/api/menu", async (req, res) => {
  try {
    const { name, price, tag, image, category } = req.body;
    if (!name || !price) return res.status(400).json({ error: "Name & Price required" });

    const menu = await readJson(MENU_FILE, []);
    const newItem = {
      id: Date.now(),
      name,
      price: Number(price),
      tag: tag || "",
      image: image || "",
      category: category || ""
    };

    menu.push(newItem);
    await writeJson(MENU_FILE, menu);
    res.status(201).json(newItem);
  } catch {
    res.status(500).json({ error: "Menu save failed" });
  }
});

app.delete("/api/menu/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    let menu = await readJson(MENU_FILE, []);
    menu = menu.filter((m) => m.id !== id);
    await writeJson(MENU_FILE, menu);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ---------- API: ORDERS ---------- */
app.get("/api/orders", async (req, res) => {
  const orders = await readJson(ORDERS_FILE, []);
  res.json(orders);
});

app.post("/api/orders", async (req, res) => {
  const { name, phone, pizza, size, qty, address } = req.body;

  if (!name || !phone || !pizza || !size || !qty || !address)
    return res.status(400).json({ error: "All fields required" });

  const orders = await readJson(ORDERS_FILE, []);
  const newOrder = {
    id: Date.now(),
    customer: name,
    phone,
    pizza,
    size,
    qty: Number(qty),
    address,
    amount: 0,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  await writeJson(ORDERS_FILE, orders);
  res.status(201).json(newOrder);
});

app.patch("/api/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status required" });

  const orders = await readJson(ORDERS_FILE, []);
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return res.status(404).json({ error: "Order not found" });

  orders[index].status = status;
  await writeJson(ORDERS_FILE, orders);
  res.json(orders[index]);
});

/* ---------- SERVER ON ---------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
