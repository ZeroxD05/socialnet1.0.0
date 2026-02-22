const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET =
  process.env.JWT_SECRET || "socialnet_secret_change_in_production";

// ── DB Setup ──────────────────────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, "data.db"));

const run = (sql, params = []) =>
  new Promise((res, rej) =>
    db.run(sql, params, function (err) {
      if (err) rej(err);
      else res(this);
    }),
  );
const get = (sql, params = []) =>
  new Promise((res, rej) =>
    db.get(sql, params, (err, row) => {
      if (err) rej(err);
      else res(row);
    }),
  );
const all = (sql, params = []) =>
  new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => {
      if (err) rej(err);
      else res(rows);
    }),
  );

async function initDB() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    plan TEXT DEFAULT 'free',
    badge TEXT DEFAULT '',
    credits INTEGER DEFAULT 5,
    last_credit_refill INTEGER DEFAULT 0,
    categories TEXT DEFAULT '[]',
    followers TEXT DEFAULT '[]',
    following TEXT DEFAULT '[]',
    plan_expires INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    text TEXT NOT NULL,
    categories TEXT DEFAULT '[]',
    likes TEXT DEFAULT '[]',
    comments TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT 0
  )`);

  await run(`CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    participants TEXT NOT NULL,
    messages TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT 0
  )`);

  // Migration: add plan_expires if missing
  try {
    await run("ALTER TABLE users ADD COLUMN plan_expires INTEGER DEFAULT 0");
  } catch {}

  // Seed admin
  const admin = await get("SELECT id FROM users WHERE id = 'admin'");
  if (!admin) {
    const hash = bcrypt.hashSync("admin123", 10);
    await run(
      `INSERT INTO users (id,username,email,password,avatar,plan,badge,credits,last_credit_refill,categories,followers,following,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        "admin",
        "admin",
        "admin@socialnet.de",
        hash,
        "A",
        "pro",
        "admin",
        999999,
        0,
        "[]",
        "[]",
        "[]",
        Date.now(),
      ],
    );
    console.log("Admin account created");
  }
  console.log("DB ready");
}

initDB().catch(console.error);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht eingeloggt" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token ungültig" });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseUser = (u) =>
  u
    ? {
        ...u,
        categories: JSON.parse(u.categories || "[]"),
        followers: JSON.parse(u.followers || "[]"),
        following: JSON.parse(u.following || "[]"),
      }
    : null;

const parsePost = (p) =>
  p
    ? {
        ...p,
        categories: JSON.parse(p.categories || "[]"),
        likes: JSON.parse(p.likes || "[]"),
        comments: JSON.parse(p.comments || "[]"),
      }
    : null;

const safeUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};

const PLAN_CREDITS = { free: 5, plus: 20, pro: 999999 };

async function checkAndRefillCredits(user) {
  if (user.plan === "pro") return user;
  const elapsed = Date.now() - (user.last_credit_refill || 0);
  if (elapsed >= 48 * 3600 * 1000) {
    const credits = PLAN_CREDITS[user.plan] || 5;
    await run("UPDATE users SET credits=?, last_credit_refill=? WHERE id=?", [
      credits,
      Date.now(),
      user.id,
    ]);
    return { ...user, credits, last_credit_refill: Date.now() };
  }
  return user;
}

async function checkPlanExpiry(user) {
  if (user.plan === "free" || !user.plan_expires) return user;
  if (Date.now() > user.plan_expires) {
    await run(
      "UPDATE users SET plan='free', badge='', credits=5, plan_expires=0 WHERE id=?",
      [user.id],
    );
    return { ...user, plan: "free", badge: "", credits: 5, plan_expires: 0 };
  }
  return user;
}

// ── Auth Routes ───────────────────────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password, categories } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: "Alle Felder ausfüllen" });
    if (await get("SELECT id FROM users WHERE email=?", [email]))
      return res.status(400).json({ error: "E-Mail bereits vergeben" });
    if (await get("SELECT id FROM users WHERE username=?", [username]))
      return res.status(400).json({ error: "Nutzername bereits vergeben" });

    const hash = bcrypt.hashSync(password, 10);
    const id = "u_" + Date.now();
    await run(
      `INSERT INTO users (id,username,email,password,avatar,plan,badge,credits,last_credit_refill,categories,followers,following,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        username,
        email,
        hash,
        username[0].toUpperCase(),
        "free",
        "",
        5,
        Date.now(),
        JSON.stringify(categories || []),
        "[]",
        "[]",
        Date.now(),
      ],
    );
    const user = parseUser(await get("SELECT * FROM users WHERE id=?", [id]));
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: safeUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await get("SELECT * FROM users WHERE email=?", [email]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(400).json({ error: "Falsche E-Mail oder Passwort" });
    user = parseUser(user);
    user = await checkPlanExpiry(user);
    user = await checkAndRefillCredits(user);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: safeUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/me", auth, async (req, res) => {
  try {
    let user = await get("SELECT * FROM users WHERE id=?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User nicht gefunden" });
    user = parseUser(user);
    user = await checkPlanExpiry(user);
    user = await checkAndRefillCredits(user);
    res.json(safeUser(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── User Routes ───────────────────────────────────────────────────────────────
app.get("/api/users", async (req, res) => {
  try {
    const users = (await all("SELECT * FROM users")).map((u) =>
      safeUser(parseUser(u)),
    );
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/users/me", auth, async (req, res) => {
  try {
    const { bio, categories } = req.body;
    await run("UPDATE users SET bio=?, categories=? WHERE id=?", [
      bio || "",
      JSON.stringify(categories || []),
      req.user.id,
    ]);
    const user = parseUser(
      await get("SELECT * FROM users WHERE id=?", [req.user.id]),
    );
    res.json(safeUser(user));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/users/:id/follow", auth, async (req, res) => {
  try {
    const target = parseUser(
      await get("SELECT * FROM users WHERE id=?", [req.params.id]),
    );
    const me = parseUser(
      await get("SELECT * FROM users WHERE id=?", [req.user.id]),
    );
    if (!target || !me)
      return res.status(404).json({ error: "User nicht gefunden" });

    const isFollowing = me.following.includes(target.id);
    const newFollowing = isFollowing
      ? me.following.filter((id) => id !== target.id)
      : [...me.following, target.id];
    const newFollowers = isFollowing
      ? target.followers.filter((id) => id !== me.id)
      : [...target.followers, me.id];

    await run("UPDATE users SET following=? WHERE id=?", [
      JSON.stringify(newFollowing),
      me.id,
    ]);
    await run("UPDATE users SET followers=? WHERE id=?", [
      JSON.stringify(newFollowers),
      target.id,
    ]);
    res.json({ following: newFollowing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin
app.patch("/api/admin/users/:id", auth, async (req, res) => {
  try {
    const me = await get("SELECT id FROM users WHERE id=?", [req.user.id]);
    if (me.id !== "admin") return res.status(403).json({ error: "Kein Admin" });
    const { plan, badge } = req.body;
    const credits = plan === "pro" ? 999999 : plan === "plus" ? 20 : 5;
    // Set expiry to end of next month for paid plans
    const expires = plan !== "free" ? Date.now() + 30 * 24 * 3600 * 1000 : 0;
    await run(
      "UPDATE users SET plan=?, badge=?, credits=?, plan_expires=? WHERE id=?",
      [plan, badge || "", credits, expires, req.params.id],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/users/:id", auth, async (req, res) => {
  try {
    const me = await get("SELECT id FROM users WHERE id=?", [req.user.id]);
    if (me.id !== "admin") return res.status(403).json({ error: "Kein Admin" });
    if (req.params.id === "admin")
      return res
        .status(400)
        .json({ error: "Admin kann nicht gelöscht werden" });
    await run("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Post Routes ───────────────────────────────────────────────────────────────
app.get("/api/posts", async (req, res) => {
  try {
    const posts = (
      await all("SELECT * FROM posts ORDER BY created_at DESC")
    ).map(parsePost);
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/posts", auth, async (req, res) => {
  try {
    const { text, categories } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Text fehlt" });
    const id = "p_" + Date.now();
    await run(
      "INSERT INTO posts (id,author_id,text,categories,likes,comments,created_at) VALUES (?,?,?,?,'[]','[]',?)",
      [id, req.user.id, text, JSON.stringify(categories || []), Date.now()],
    );
    res.json(parsePost(await get("SELECT * FROM posts WHERE id=?", [id])));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/posts/:id/like", auth, async (req, res) => {
  try {
    const post = parsePost(
      await get("SELECT * FROM posts WHERE id=?", [req.params.id]),
    );
    if (!post) return res.status(404).json({ error: "Post nicht gefunden" });
    const liked = post.likes.includes(req.user.id);
    const newLikes = liked
      ? post.likes.filter((id) => id !== req.user.id)
      : [...post.likes, req.user.id];
    await run("UPDATE posts SET likes=? WHERE id=?", [
      JSON.stringify(newLikes),
      post.id,
    ]);
    res.json({ likes: newLikes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/posts/:id/comment", auth, async (req, res) => {
  try {
    const post = parsePost(
      await get("SELECT * FROM posts WHERE id=?", [req.params.id]),
    );
    if (!post) return res.status(404).json({ error: "Post nicht gefunden" });
    const comment = {
      id: "c_" + Date.now(),
      authorId: req.user.id,
      text: req.body.text,
      createdAt: Date.now(),
    };
    const newComments = [...post.comments, comment];
    await run("UPDATE posts SET comments=? WHERE id=?", [
      JSON.stringify(newComments),
      post.id,
    ]);
    res.json({ comments: newComments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Conversation Routes ───────────────────────────────────────────────────────
app.get("/api/conversations", auth, async (req, res) => {
  try {
    const all_convs = await all("SELECT * FROM conversations");
    const mine = all_convs.filter((c) =>
      JSON.parse(c.participants).includes(req.user.id),
    );
    res.json(
      mine.map((c) => ({
        ...c,
        participants: JSON.parse(c.participants),
        messages: JSON.parse(c.messages),
      })),
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/conversations", auth, async (req, res) => {
  try {
    const { targetId } = req.body;
    const me = parseUser(
      await get("SELECT * FROM users WHERE id=?", [req.user.id]),
    );

    const all_convs = await all("SELECT * FROM conversations");
    const existing = all_convs.find((c) => {
      const p = JSON.parse(c.participants);
      return p.includes(me.id) && p.includes(targetId);
    });

    if (!existing) {
      if (me.plan !== "pro" && me.credits <= 0)
        return res
          .status(400)
          .json({ error: "Keine Credits! Warte 48h für neue." });
      if (me.plan !== "pro")
        await run("UPDATE users SET credits=credits-1 WHERE id=?", [me.id]);

      const id = "conv_" + Date.now();
      await run(
        "INSERT INTO conversations (id,participants,messages,created_at) VALUES (?,?,'[]',?)",
        [id, JSON.stringify([me.id, targetId]), Date.now()],
      );
      const conv = await get("SELECT * FROM conversations WHERE id=?", [id]);
      return res.json({
        ...conv,
        participants: JSON.parse(conv.participants),
        messages: [],
      });
    }
    res.json({
      ...existing,
      participants: JSON.parse(existing.participants),
      messages: JSON.parse(existing.messages),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/conversations/:id/messages", auth, async (req, res) => {
  try {
    const conv = await get("SELECT * FROM conversations WHERE id=?", [
      req.params.id,
    ]);
    if (!conv) return res.status(404).json({ error: "Chat nicht gefunden" });
    const messages = JSON.parse(conv.messages);
    messages.push({
      id: "m_" + Date.now(),
      senderId: req.user.id,
      text: req.body.text,
      createdAt: Date.now(),
    });
    await run("UPDATE conversations SET messages=? WHERE id=?", [
      JSON.stringify(messages),
      conv.id,
    ]);
    res.json({ messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const fs = require("fs");
  const distPath = path.join(__dirname, "../client/dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
}

app.listen(PORT, () =>
  console.log(`✅ Server läuft auf http://localhost:${PORT}`),
);
