const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DATA_DIR = path.join(__dirname, "data");
const MENU_FILE = path.join(DATA_DIR, "menu.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve HTML, CSS, JS

// Helpers
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creating data directory:", err);
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

/* ---------- MENU ROUTES ---------- */

// GET all menu
app.get("/api/menu", async (req, res) => {
  try {
    const menu = await readJson(MENU_FILE, []);
    res.json(menu);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read menu" });
  }
});

// POST add menu item
app.post("/api/menu", async (req, res) => {
  try {
    const { name, price, tag, image, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "name and price required" });
    }

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add menu item" });
  }
});

// DELETE menu item
app.delete("/api/menu/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    let menu = await readJson(MENU_FILE, []);
    const before = menu.length;
    menu = menu.filter((m) => m.id !== id);
    if (menu.length === before) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    await writeJson(MENU_FILE, menu);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

/* ---------- ORDERS ROUTES ---------- */

// GET all orders
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await readJson(ORDERS_FILE, []);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read orders" });
  }
});

// POST create order
app.post("/api/orders", async (req, res) => {
  try {
    const { name, phone, pizza, size, qty, address } = req.body;

    if (!name || !phone || !pizza || !size || !qty || !address) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const menu = await readJson(MENU_FILE, []);
    const menuItem = menu.find((m) => m.name === pizza);
    const basePrice = menuItem ? menuItem.price : 0;
    const quantity = Number(qty) || 1;
    const amount = basePrice * quantity;

    const orders = await readJson(ORDERS_FILE, []);
    const newOrder = {
      id: Date.now(),
      customer: name,
      phone,
      pizza,
      size,
      qty: quantity,
      address,
      amount,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    await writeJson(ORDERS_FILE, orders);

    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// PATCH update order status
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const orders = await readJson(ORDERS_FILE, []);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: "Order not found" });

    orders[idx].status = status;
    await writeJson(ORDERS_FILE, orders);
    res.json(orders[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

/* ---------- SETTINGS ROUTES ---------- */

// GET settings
app.get("/api/settings", async (req, res) => {
  try {
    const defaultSettings = {
      storeName: "Pizza Hut Style - Demo Branch",
      storeTiming: "11:00 AM – 11:30 PM",
      storePhone: "+91-98765-43210",
      storeRadius: 6
    };
    const settings = await readJson(SETTINGS_FILE, defaultSettings);
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read settings" });
  }
});

// POST settings
app.post("/api/settings", async (req, res) => {
  try {
    const { storeName, storeTiming, storePhone, storeRadius } = req.body;
    const data = {
      storeName,
      storeTiming,
      storePhone,
      storeRadius: Number(storeRadius) || 0
    };
    await writeJson(SETTINGS_FILE, data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

/* ---------- FRONTEND ROUTES FIX ---------- */

// Homepage route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Admin login route
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

// Fallback route (for other pages)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------- START SERVER ---------- */

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
