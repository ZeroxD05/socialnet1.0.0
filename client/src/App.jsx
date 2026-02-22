import { useState, useEffect, useRef } from "react";

const API = "/api";
const CATEGORIES = [
  "Tech",
  "Gaming",
  "Music",
  "Art",
  "Travel",
  "Sports",
  "Food",
  "Fashion",
  "Science",
  "Fitness",
  "Books",
  "Film",
  "Photography",
  "Politics",
  "Business",
];
const BADGE_ICONS = { admin: "⚙️", pro: "⭐", plus: "✨", verified: "✔️" };
const PLAN_CREDITS = { free: 5, plus: 20, pro: Infinity };

const api = async (method, path, body, token) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fehler");
  return data;
};

const timeAgo = (ts) => {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "gerade eben";
  if (d < 3600) return `vor ${Math.floor(d / 60)}m`;
  if (d < 86400) return `vor ${Math.floor(d / 3600)}h`;
  return `vor ${Math.floor(d / 86400)}d`;
};
const avatar = (u) => u?.avatar || u?.username?.[0]?.toUpperCase() || "?";

// Count unread messages across all conversations
const countUnread = (conversations, userId, seenRef) => {
  let count = 0;
  for (const conv of conversations) {
    const msgs = conv.messages || [];
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg) continue;
    if (lastMsg.senderId === userId) continue;
    const seenCount = seenRef.current[conv.id] || 0;
    const unread = msgs.filter((m) => m.senderId !== userId).length - seenCount;
    if (unread > 0) count += unread;
  }
  return count;
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("sn_token"));
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [screen, setScreen] = useState("feed");
  const [viewUser, setViewUser] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeConvRef = useRef(null);
  const seenMessagesRef = useRef({}); // { convId: count of seen messages from others }
  activeConvRef.current = activeConv;

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPublic = async () => {
    try {
      const [us, ps] = await Promise.all([
        api("GET", "/users", null, null),
        api("GET", "/posts", null, null),
      ]);
      setUsers(us);
      setPosts(ps);
    } catch (e) {
      console.error("loadPublic:", e);
    }
  };

  const loadPrivate = async (tok) => {
    try {
      const [u, cs] = await Promise.all([
        api("GET", "/me", null, tok),
        api("GET", "/conversations", null, tok),
      ]);
      setCurrentUser(u);
      setConversations(cs);
      return u;
    } catch (e) {
      localStorage.removeItem("sn_token");
      setToken(null);
      return null;
    }
  };

  const loadData = async (tok) => {
    await Promise.all([
      loadPublic(),
      tok ? loadPrivate(tok) : Promise.resolve(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData(token);
  }, []);

  // Auto-refresh posts every 10s
  useEffect(() => {
    const t = setInterval(() => loadPublic(), 10000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh conversations every 3s + update unread count
  useEffect(() => {
    if (!token || !currentUser) return;
    const t = setInterval(async () => {
      try {
        const cs = await api("GET", "/conversations", null, token);
        setConversations(cs);
        if (activeConvRef.current) {
          const updated = cs.find((c) => c.id === activeConvRef.current.id);
          if (updated) setActiveConv(updated);
        }
        // Calculate unread
        const uid = currentUser.id;
        let count = 0;
        for (const conv of cs) {
          const msgs = (conv.messages || []).filter((m) => m.senderId !== uid);
          const seen = seenMessagesRef.current[conv.id] || 0;
          count += Math.max(0, msgs.length - seen);
        }
        setUnreadCount(count);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [token, currentUser]);

  // Mark messages as seen when viewing a conversation
  const markSeen = (conv) => {
    if (!conv || !currentUser) return;
    const msgs = (conv.messages || []).filter(
      (m) => m.senderId !== currentUser.id,
    );
    seenMessagesRef.current[conv.id] = msgs.length;
    // Recalculate unread
    let count = 0;
    for (const c of conversations) {
      const cMsgs = (c.messages || []).filter(
        (m) => m.senderId !== currentUser.id,
      );
      const seen = seenMessagesRef.current[c.id] || 0;
      count += Math.max(0, cMsgs.length - seen);
    }
    setUnreadCount(count);
  };

  const login = async (email, password) => {
    try {
      const { token: tok, user } = await api("POST", "/login", {
        email,
        password,
      });
      localStorage.setItem("sn_token", tok);
      setToken(tok);
      setCurrentUser(user);
      await loadData(tok);
      setScreen("feed");
      showToast(`Willkommen zurück, ${user.username}!`, "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const register = async (form) => {
    try {
      const { token: tok, user } = await api("POST", "/register", form);
      localStorage.setItem("sn_token", tok);
      setToken(tok);
      setCurrentUser(user);
      await loadData(tok);
      setScreen("feed");
      showToast("Willkommen bei SocialNet! 🎉", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const logout = () => {
    localStorage.removeItem("sn_token");
    setToken(null);
    setCurrentUser(null);
    setScreen("feed");
    setUnreadCount(0);
    seenMessagesRef.current = {};
  };

  const createPost = async (text, cats) => {
    try {
      const post = await api(
        "POST",
        "/posts",
        { text, categories: cats },
        token,
      );
      setPosts((prev) => [post, ...prev]);
      showToast("Post veröffentlicht!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const toggleLike = async (postId) => {
    try {
      const { likes } = await api("POST", `/posts/${postId}/like`, {}, token);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes } : p)),
      );
    } catch {}
  };

  const addComment = async (postId, text) => {
    try {
      const { comments } = await api(
        "POST",
        `/posts/${postId}/comment`,
        { text },
        token,
      );
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments } : p)),
      );
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const follow = async (targetId) => {
    try {
      const { following } = await api(
        "POST",
        `/users/${targetId}/follow`,
        {},
        token,
      );
      setCurrentUser((prev) => ({ ...prev, following }));
      const updated = await api("GET", "/users", null, null);
      setUsers(updated);
      if (viewUser?.id === targetId)
        setViewUser(updated.find((u) => u.id === targetId));
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const startConversation = async (targetId) => {
    try {
      const conv = await api("POST", "/conversations", { targetId }, token);
      setConversations((prev) =>
        prev.find((c) => c.id === conv.id) ? prev : [...prev, conv],
      );
      setActiveConv(conv);
      markSeen(conv);
      setScreen("messages");
      setMobileMenuOpen(false);
      if (currentUser.plan !== "pro")
        setCurrentUser((prev) => ({
          ...prev,
          credits: Math.max(0, prev.credits - 1),
        }));
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const sendMessage = async (convId, text) => {
    try {
      const { messages } = await api(
        "POST",
        `/conversations/${convId}/messages`,
        { text },
        token,
      );
      const updated = conversations.map((c) =>
        c.id === convId ? { ...c, messages } : c,
      );
      setConversations(updated);
      const updatedConv = updated.find((c) => c.id === convId);
      setActiveConv(updatedConv);
      markSeen(updatedConv);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const updateProfile = async (data) => {
    try {
      const user = await api("PATCH", "/users/me", data, token);
      setCurrentUser(user);
      showToast("Profil gespeichert!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const adminSetPlan = async (uid, plan, badge) => {
    try {
      await api("PATCH", `/admin/users/${uid}`, { plan, badge }, token);
      const updated = await api("GET", "/users", null, null);
      setUsers(updated);
      showToast("Aktualisiert!", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const adminDelete = async (uid) => {
    try {
      await api("DELETE", `/admin/users/${uid}`, null, token);
      setUsers((prev) => prev.filter((u) => u.id !== uid));
      showToast("User gelöscht", "success");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const upgrade = async (plan) => {
    const badge = plan === "pro" ? "pro" : plan === "plus" ? "plus" : "";
    await adminSetPlan(currentUser.id, plan, badge);
    setCurrentUser((prev) => ({
      ...prev,
      plan,
      badge,
      credits: PLAN_CREDITS[plan],
    }));
    showToast(`Upgrade auf ${plan} erfolgreich! 🎉`, "success");
    setScreen("feed");
  };

  const navTo = (s) => {
    setScreen(s);
    setMobileMenuOpen(false);
    if (s !== "profile") setViewUser(null);
  };

  if (loading)
    return (
      <div style={S.loader}>
        <div style={S.spinner} />
      </div>
    );

  if (!currentUser)
    return (
      <div style={S.root}>
        <style>{CSS}</style>
        {toast && <Toast toast={toast} />}
        {screen === "register" ? (
          <RegisterScreen
            onRegister={register}
            onSwitch={() => setScreen("login")}
          />
        ) : screen === "login" ? (
          <LoginScreen onLogin={login} onSwitch={() => setScreen("register")} />
        ) : (
          <PublicFeedScreen
            users={users}
            posts={posts}
            onLoginRequired={() => setScreen("login")}
            onSwitchRegister={() => setScreen("register")}
          />
        )}
      </div>
    );

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      {toast && <Toast toast={toast} />}

      {/* Mobile Top Bar */}
      <div style={S.mobileBar}>
        <div style={S.logo}>SocialNet</div>
        <button
          style={S.hamburger}
          onClick={() => setMobileMenuOpen((o) => !o)}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div style={S.layout}>
        {/* Sidebar – hidden on mobile unless menu open */}
        <aside
          style={{ ...S.sidebar, ...(mobileMenuOpen ? S.sidebarOpen : {}) }}
        >
          <div style={{ ...S.logo, display: "none" }} className="desktop-logo">
            SocialNet
          </div>
          <div style={S.sideUserCard}>
            <div style={S.avatarSm}>{avatar(currentUser)}</div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentUser.username}{" "}
                {currentUser.badge && BADGE_ICONS[currentUser.badge]}
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {currentUser.plan === "pro"
                  ? "Pro – ∞"
                  : currentUser.plan === "plus"
                    ? `Plus – ${currentUser.credits}cr`
                    : `Free – ${currentUser.credits}cr`}
              </div>
            </div>
          </div>
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              flex: 1,
            }}
          >
            {[
              { id: "feed", icon: "🏠", label: "Feed" },
              { id: "explore", icon: "🔍", label: "Erkunden" },
              {
                id: "messages",
                icon: "💬",
                label: "Nachrichten",
                badge: unreadCount,
              },
              { id: "profile", icon: "👤", label: "Profil" },
              { id: "upgrade", icon: "⭐", label: "Upgrade" },
              ...(currentUser.id === "admin"
                ? [{ id: "admin", icon: "⚙️", label: "Admin" }]
                : []),
            ].map((i) => (
              <button
                key={i.id}
                style={{
                  ...S.navBtn,
                  ...(screen === i.id ? S.navBtnActive : {}),
                }}
                onClick={() => navTo(i.id)}
              >
                <span
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {i.icon}
                  {i.badge > 0 && (
                    <span style={S.badge}>
                      {i.badge > 99 ? "99+" : i.badge}
                    </span>
                  )}
                </span>
                {i.label}
              </button>
            ))}
          </nav>
          <button style={S.logoutBtn} onClick={logout}>
            🚪 Abmelden
          </button>
        </aside>

        {/* Overlay for mobile menu */}
        {mobileMenuOpen && (
          <div style={S.overlay} onClick={() => setMobileMenuOpen(false)} />
        )}

        <main style={S.main}>
          {screen === "feed" && (
            <FeedScreen
              currentUser={currentUser}
              users={users}
              posts={posts}
              onPost={createPost}
              onLike={toggleLike}
              onComment={addComment}
              onViewUser={(u) => {
                setViewUser(u);
                setScreen("profile");
                setMobileMenuOpen(false);
              }}
              onMessage={startConversation}
            />
          )}
          {screen === "explore" && (
            <ExploreScreen
              currentUser={currentUser}
              users={users}
              onViewUser={(u) => {
                setViewUser(u);
                setScreen("profile");
                setMobileMenuOpen(false);
              }}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              viewUser={viewUser || currentUser}
              currentUser={currentUser}
              users={users}
              posts={posts}
              onLike={toggleLike}
              onComment={addComment}
              onFollow={follow}
              onMessage={startConversation}
              onUpdate={updateProfile}
              isOwn={!viewUser || viewUser.id === currentUser.id}
            />
          )}
          {screen === "messages" && (
            <MessagesScreen
              currentUser={currentUser}
              users={users}
              conversations={conversations}
              activeConv={activeConv}
              setActiveConv={(c) => {
                setActiveConv(c);
                if (c) markSeen(c);
              }}
              onSend={sendMessage}
              onViewUser={(u) => {
                setViewUser(u);
                setScreen("profile");
              }}
            />
          )}
          {screen === "upgrade" && (
            <UpgradeScreen currentUser={currentUser} onUpgrade={upgrade} />
          )}
          {screen === "admin" && currentUser.id === "admin" && (
            <AdminPanel
              users={users}
              posts={posts}
              onDelete={adminDelete}
              onSave={adminSetPlan}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav style={S.bottomNav}>
        {[
          { id: "feed", icon: "🏠" },
          { id: "explore", icon: "🔍" },
          { id: "messages", icon: "💬", badge: unreadCount },
          { id: "profile", icon: "👤" },
          { id: "upgrade", icon: "⭐" },
        ].map((i) => (
          <button
            key={i.id}
            style={{
              ...S.bottomNavBtn,
              ...(screen === i.id ? S.bottomNavBtnActive : {}),
            }}
            onClick={() => navTo(i.id)}
          >
            <span style={{ position: "relative" }}>
              {i.icon}
              {i.badge > 0 && (
                <span style={S.badgeSm}>{i.badge > 99 ? "99+" : i.badge}</span>
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Toast({ toast }) {
  const colors = { info: "#4f9cf9", success: "#22c55e", error: "#ef4444" };
  return (
    <div style={{ ...S.toast, background: colors[toast.type] }}>
      {toast.msg}
    </div>
  );
}

function PublicFeedScreen({ users, posts, onLoginRequired, onSwitchRegister }) {
  const [filter, setFilter] = useState("all");
  const getUser = (id) => users.find((u) => u.id === id);
  const filtered = posts
    .filter((p) => (filter === "all" ? true : p.categories?.includes(filter)))
    .filter((p) => !!getUser(p.authorId));

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.publicBar}>
        <div style={S.logo}>SocialNet</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...S.btnOutline, padding: "8px 16px" }}
            onClick={onLoginRequired}
          >
            Einloggen
          </button>
          <button
            style={{ ...S.btn, width: "auto", padding: "8px 16px" }}
            onClick={onSwitchRegister}
          >
            Registrieren
          </button>
        </div>
      </div>
      <div style={S.publicHero}>
        <h1
          style={{
            fontSize: "clamp(22px, 5vw, 36px)",
            fontWeight: 800,
            margin: "0 0 10px",
            letterSpacing: -1,
          }}
        >
          Willkommen bei <span style={{ color: "#4f9cf9" }}>SocialNet</span>
        </h1>
        <p style={{ color: "#888", fontSize: 15, margin: "0 0 20px" }}>
          Verbinde dich mit Menschen die deine Interessen teilen.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{ ...S.btn, width: "auto", padding: "11px 28px" }}
            onClick={onSwitchRegister}
          >
            Kostenlos registrieren
          </button>
          <button
            style={{ ...S.btnOutline, padding: "11px 24px" }}
            onClick={onLoginRequired}
          >
            Einloggen
          </button>
        </div>
      </div>
      <div
        style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 80px" }}
      >
        <div style={S.filterBar}>
          {["all", ...CATEGORIES.slice(0, 8)].map((f) => (
            <button
              key={f}
              style={{
                ...S.filterBtn,
                ...(filter === f ? S.filterBtnActive : {}),
              }}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Alle" : f}
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={S.empty}>Noch keine Posts 🌙</div>
        )}
        {filtered.map((p) => {
          const author = getUser(p.authorId);
          return (
            <div key={p.id} style={S.card}>
              <div style={S.postHeader}>
                <div style={S.avatarSm}>{avatar(author)}</div>
                <div>
                  <span style={{ color: "#fff", fontWeight: 600 }}>
                    {author.username}{" "}
                    {author.badge && BADGE_ICONS[author.badge]}
                  </span>
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {timeAgo(p.createdAt)}
                  </div>
                </div>
              </div>
              <p style={S.postText}>{p.text}</p>
              {p.categories?.length > 0 && (
                <div style={S.tagRow}>
                  {p.categories.map((c) => (
                    <span key={c} style={S.tag}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <div style={S.postActions}>
                <button style={S.actionBtn} onClick={onLoginRequired}>
                  🤍 {p.likes?.length || 0}
                </button>
                <button style={S.actionBtn} onClick={onLoginRequired}>
                  💬 {p.comments?.length || 0}
                </button>
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: "7px 12px",
                  background: "#0d1a2a",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#4f9cf9",
                  cursor: "pointer",
                }}
                onClick={onLoginRequired}
              >
                🔒 Einloggen um zu interagieren
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <div style={S.authLogo}>SocialNet</div>
        <p style={{ color: "#888", textAlign: "center", marginBottom: 28 }}>
          Verbinde dich mit der Welt
        </p>
        <input
          style={S.input}
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          onKeyDown={(e) => e.key === "Enter" && onLogin(email, pw)}
        />
        <input
          style={S.input}
          placeholder="Passwort"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
          onKeyDown={(e) => e.key === "Enter" && onLogin(email, pw)}
        />
        <button style={S.btn} onClick={() => onLogin(email, pw)}>
          Einloggen
        </button>
        <p
          style={{
            textAlign: "center",
            color: "#888",
            marginTop: 16,
            fontSize: 14,
          }}
        >
          Noch kein Account?{" "}
          <span
            style={{ color: "#4f9cf9", cursor: "pointer" }}
            onClick={onSwitch}
          >
            Registrieren
          </span>
        </p>
        <p
          style={{
            textAlign: "center",
            color: "#555",
            fontSize: 12,
            marginTop: 12,
          }}
        >
          Admin: admin@socialnet.de / admin123
        </p>
      </div>
    </div>
  );
}

function RegisterScreen({ onRegister, onSwitch }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    categories: [],
  });
  const toggle = (c) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    }));
  return (
    <div style={S.authWrap}>
      <div style={{ ...S.authCard, maxWidth: 480 }}>
        <div style={S.authLogo}>SocialNet</div>
        <input
          style={S.input}
          placeholder="Nutzername"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
        />
        <input
          style={S.input}
          placeholder="E-Mail"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          type="email"
        />
        <input
          style={S.input}
          placeholder="Passwort"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          type="password"
        />
        <p style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>
          Interessen (optional):
        </p>
        <div style={S.catGrid}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              style={{
                ...S.catBtn,
                ...(form.categories.includes(c) ? S.catBtnActive : {}),
              }}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          style={{ ...S.btn, marginTop: 8 }}
          onClick={() => onRegister(form)}
        >
          Account erstellen
        </button>
        <p
          style={{
            textAlign: "center",
            color: "#888",
            marginTop: 16,
            fontSize: 14,
          }}
        >
          Bereits registriert?{" "}
          <span
            style={{ color: "#4f9cf9", cursor: "pointer" }}
            onClick={onSwitch}
          >
            Einloggen
          </span>
        </p>
      </div>
    </div>
  );
}

function FeedScreen({
  currentUser,
  users,
  posts,
  onPost,
  onLike,
  onComment,
  onViewUser,
  onMessage,
}) {
  const [text, setText] = useState("");
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showComment, setShowComment] = useState(null);
  const [commentText, setCommentText] = useState("");

  const getUser = (id) => users.find((u) => u.id === id);
  const filtered = posts
    .filter((p) =>
      filter === "all"
        ? true
        : filter === "following"
          ? currentUser.following?.includes(p.authorId)
          : p.categories?.includes(filter),
    )
    .filter((p) => !!getUser(p.authorId));

  return (
    <div style={S.page}>
      <div style={S.composer}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={S.avatarSm}>{avatar(currentUser)}</div>
          <textarea
            style={{ ...S.textarea, flex: 1 }}
            placeholder="Was denkst du?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
        </div>
        <div style={S.catGrid}>
          {CATEGORIES.slice(0, 10).map((c) => (
            <button
              key={c}
              style={{
                ...S.catBtn,
                ...(cats.includes(c) ? S.catBtnActive : {}),
              }}
              onClick={() =>
                setCats((p) =>
                  p.includes(c) ? p.filter((x) => x !== c) : [...p, c],
                )
              }
            >
              {c}
            </button>
          ))}
        </div>
        <button
          style={{
            ...S.btn,
            width: "auto",
            alignSelf: "flex-end",
            padding: "10px 28px",
          }}
          onClick={() => {
            if (text.trim()) {
              onPost(text, cats);
              setText("");
              setCats([]);
            }
          }}
        >
          Posten
        </button>
      </div>
      <div style={S.filterBar}>
        {["all", "following", ...CATEGORIES.slice(0, 8)].map((f) => (
          <button
            key={f}
            style={{
              ...S.filterBtn,
              ...(filter === f ? S.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Alle" : f === "following" ? "Folgend" : f}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div style={S.empty}>Keine Posts 🌙</div>}
      {filtered.map((p) => {
        const author = getUser(p.authorId);
        const liked = p.likes?.includes(currentUser.id);
        return (
          <div key={p.id} style={S.card}>
            <div style={S.postHeader}>
              <div
                style={{ ...S.avatarSm, cursor: "pointer" }}
                onClick={() => onViewUser(author)}
              >
                {avatar(author)}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{ color: "#fff", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => onViewUser(author)}
                >
                  {author.username} {author.badge && BADGE_ICONS[author.badge]}
                </span>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {timeAgo(p.createdAt)}
                </div>
              </div>
              {author.id !== currentUser.id && (
                <button style={S.iconBtn} onClick={() => onMessage(author.id)}>
                  💬
                </button>
              )}
            </div>
            <p style={S.postText}>{p.text}</p>
            {p.categories?.length > 0 && (
              <div style={S.tagRow}>
                {p.categories.map((c) => (
                  <span key={c} style={S.tag}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            <div style={S.postActions}>
              <button
                style={{ ...S.actionBtn, color: liked ? "#ef4444" : "#888" }}
                onClick={() => onLike(p.id)}
              >
                {liked ? "❤️" : "🤍"} {p.likes?.length || 0}
              </button>
              <button
                style={S.actionBtn}
                onClick={() =>
                  setShowComment(showComment === p.id ? null : p.id)
                }
              >
                💬 {p.comments?.length || 0}
              </button>
            </div>
            {showComment === p.id && (
              <div style={{ marginTop: 12 }}>
                {p.comments?.map((c) => {
                  const cu = getUser(c.authorId);
                  return (
                    <div key={c.id} style={S.comment}>
                      <b style={{ color: "#aaa" }}>{cu?.username}:</b> {c.text}
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    style={{
                      ...S.input,
                      margin: 0,
                      flex: 1,
                      padding: "8px 12px",
                    }}
                    placeholder="Kommentar..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) {
                        onComment(p.id, commentText);
                        setCommentText("");
                      }
                    }}
                  />
                  <button
                    style={{ ...S.btn, width: "auto", padding: "8px 16px" }}
                    onClick={() => {
                      if (commentText.trim()) {
                        onComment(p.id, commentText);
                        setCommentText("");
                      }
                    }}
                  >
                    ↵
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExploreScreen({ currentUser, users, onViewUser }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const filtered = users.filter(
    (u) =>
      u.id !== currentUser.id &&
      (search === "" ||
        u.username.toLowerCase().includes(search.toLowerCase())) &&
      (cat === "all" || u.categories?.includes(cat)),
  );
  return (
    <div style={S.page}>
      <h2 style={S.heading}>Erkunden</h2>
      <input
        style={S.input}
        placeholder="🔍 Nutzer suchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={S.filterBar}>
        <button
          style={{
            ...S.filterBtn,
            ...(cat === "all" ? S.filterBtnActive : {}),
          }}
          onClick={() => setCat("all")}
        >
          Alle
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            style={{ ...S.filterBtn, ...(cat === c ? S.filterBtnActive : {}) }}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={S.userGrid}>
        {filtered.map((u) => (
          <div key={u.id} style={S.userCard} onClick={() => onViewUser(u)}>
            <div style={S.avatarLg}>{avatar(u)}</div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
              {u.username} {u.badge && BADGE_ICONS[u.badge]}
            </div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
              {u.plan}
            </div>
            <div style={S.tagRow}>
              {u.categories?.slice(0, 3).map((c) => (
                <span key={c} style={S.tag}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={S.empty}>Keine Nutzer gefunden</div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({
  viewUser,
  currentUser,
  users,
  posts,
  onLike,
  onComment,
  onFollow,
  onMessage,
  onUpdate,
  isOwn,
}) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(viewUser.bio || "");
  const [cats, setCats] = useState(viewUser.categories || []);
  const [showComment, setShowComment] = useState(null);
  const [commentText, setCommentText] = useState("");
  const userPosts = posts.filter((p) => p.authorId === viewUser.id);
  const isFollowing = currentUser.following?.includes(viewUser.id);
  const getUser = (id) => users.find((u) => u.id === id);

  return (
    <div style={S.page}>
      <div style={S.profileHero}>
        <div style={S.avatarXl}>{avatar(viewUser)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "clamp(16px,4vw,22px)",
            }}
          >
            {viewUser.username}{" "}
            {viewUser.badge && <span>{BADGE_ICONS[viewUser.badge]}</span>}
          </h2>
          <div style={{ color: "#888", fontSize: 13, margin: "4px 0 8px" }}>
            {viewUser.plan === "pro"
              ? "⭐ Pro"
              : viewUser.plan === "plus"
                ? "✨ Plus"
                : "Free"}
          </div>
          <p style={{ color: "#aaa", fontSize: 14, margin: "0 0 12px" }}>
            {viewUser.bio || "Keine Bio"}
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ color: "#aaa", fontSize: 13 }}>
              <b style={{ color: "#fff" }}>{viewUser.followers?.length || 0}</b>{" "}
              Follower
            </span>
            <span style={{ color: "#aaa", fontSize: 13 }}>
              <b style={{ color: "#fff" }}>{viewUser.following?.length || 0}</b>{" "}
              Folge ich
            </span>
            <span style={{ color: "#aaa", fontSize: 13 }}>
              <b style={{ color: "#fff" }}>{userPosts.length}</b> Posts
            </span>
          </div>
          {!isOwn && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                style={{
                  ...(isFollowing ? S.btnOutline : S.btn),
                  width: "auto",
                  padding: "9px 20px",
                }}
                onClick={() => onFollow(viewUser.id)}
              >
                {isFollowing ? "Entfolgen" : "Folgen"}
              </button>
              <button
                style={{ ...S.btnOutline, padding: "9px 20px" }}
                onClick={() => onMessage(viewUser.id)}
              >
                💬 Nachricht
              </button>
            </div>
          )}
          {isOwn && !editing && (
            <button
              style={{
                ...S.btn,
                marginTop: 14,
                width: "auto",
                padding: "9px 20px",
              }}
              onClick={() => setEditing(true)}
            >
              ✏️ Bearbeiten
            </button>
          )}
        </div>
      </div>
      {isOwn && editing && (
        <div style={S.composer}>
          <textarea
            style={S.textarea}
            placeholder="Bio..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
          />
          <div style={S.catGrid}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                style={{
                  ...S.catBtn,
                  ...(cats.includes(c) ? S.catBtnActive : {}),
                }}
                onClick={() =>
                  setCats((p) =>
                    p.includes(c) ? p.filter((x) => x !== c) : [...p, c],
                  )
                }
              >
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ ...S.btn, width: "auto", padding: "10px 24px" }}
              onClick={() => {
                onUpdate({ bio, categories: cats });
                setEditing(false);
              }}
            >
              Speichern
            </button>
            <button
              style={{ ...S.btnOutline, padding: "10px 20px" }}
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
      <h3 style={S.heading}>Posts</h3>
      {userPosts.length === 0 && <div style={S.empty}>Noch keine Posts</div>}
      {userPosts.map((p) => {
        const liked = p.likes?.includes(currentUser.id);
        return (
          <div key={p.id} style={S.card}>
            <p style={S.postText}>{p.text}</p>
            {p.categories?.length > 0 && (
              <div style={S.tagRow}>
                {p.categories.map((c) => (
                  <span key={c} style={S.tag}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>
              {timeAgo(p.createdAt)}
            </div>
            <div style={S.postActions}>
              <button
                style={{ ...S.actionBtn, color: liked ? "#ef4444" : "#888" }}
                onClick={() => onLike(p.id)}
              >
                {liked ? "❤️" : "🤍"} {p.likes?.length || 0}
              </button>
              <button
                style={S.actionBtn}
                onClick={() =>
                  setShowComment(showComment === p.id ? null : p.id)
                }
              >
                💬 {p.comments?.length || 0}
              </button>
            </div>
            {showComment === p.id && (
              <div style={{ marginTop: 10 }}>
                {p.comments?.map((c) => {
                  const cu = getUser(c.authorId);
                  return (
                    <div key={c.id} style={S.comment}>
                      <b style={{ color: "#aaa" }}>{cu?.username}:</b> {c.text}
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    style={{
                      ...S.input,
                      margin: 0,
                      flex: 1,
                      padding: "8px 12px",
                    }}
                    placeholder="Kommentar..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) {
                        onComment(p.id, commentText);
                        setCommentText("");
                      }
                    }}
                  />
                  <button
                    style={{ ...S.btn, width: "auto", padding: "8px 16px" }}
                    onClick={() => {
                      if (commentText.trim()) {
                        onComment(p.id, commentText);
                        setCommentText("");
                      }
                    }}
                  >
                    ↵
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessagesScreen({
  currentUser,
  users,
  conversations,
  activeConv,
  setActiveConv,
  onSend,
  onViewUser,
}) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const mine = conversations.filter((c) =>
    c.participants?.includes(currentUser.id),
  );
  const getOther = (c) =>
    users.find(
      (u) => u.id === c.participants?.find((id) => id !== currentUser.id),
    );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
      {/* Conv list – hidden on mobile when conv is open */}
      <div
        style={{
          ...S.convList,
          ...(activeConv ? { display: "none" } : {}),
          display: "flex",
          flexDirection: "column",
        }}
        className="conv-list-panel"
      >
        <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 16 }}>
          Nachrichten
        </h3>
        {mine.length === 0 && (
          <div style={{ color: "#666", fontSize: 13 }}>Noch keine Chats</div>
        )}
        {mine.map((c) => {
          const other = getOther(c);
          if (!other) return null;
          const last = c.messages?.[c.messages.length - 1];
          const unread = (c.messages || []).filter(
            (m) => m.senderId !== currentUser.id,
          ).length;
          return (
            <div
              key={c.id}
              style={{
                ...S.convItem,
                ...(activeConv?.id === c.id ? S.convItemActive : {}),
              }}
              onClick={() => setActiveConv(c)}
            >
              <div style={S.avatarSm}>{avatar(other)}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14 }}>
                  {other.username} {other.badge && BADGE_ICONS[other.badge]}
                </div>
                {last && (
                  <div
                    style={{
                      color: "#888",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {last.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {!activeConv ? (
          <div style={S.empty}>Wähle einen Chat</div>
        ) : (
          <>
            <div style={S.chatHeader}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 18,
                  marginRight: 8,
                }}
                onClick={() => setActiveConv(null)}
              >
                ←
              </button>
              {(() => {
                const other = getOther(activeConv);
                return other ? (
                  <>
                    <div
                      style={{ ...S.avatarSm, cursor: "pointer" }}
                      onClick={() => onViewUser(other)}
                    >
                      {avatar(other)}
                    </div>
                    <span
                      style={{ color: "#fff", cursor: "pointer" }}
                      onClick={() => onViewUser(other)}
                    >
                      {other.username} {other.badge && BADGE_ICONS[other.badge]}
                    </span>
                  </>
                ) : null;
              })()}
            </div>
            <div style={S.msgArea}>
              {activeConv.messages?.map((m) => {
                const isMe = m.senderId === currentUser.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        ...S.bubble,
                        ...(isMe ? S.bubbleMe : S.bubbleThem),
                      }}
                    >
                      {m.text}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3 }}>
                        {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div style={S.msgInput}>
              <input
                style={{ ...S.input, margin: 0, flex: 1 }}
                placeholder="Nachricht..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && text.trim()) {
                    onSend(activeConv.id, text);
                    setText("");
                  }
                }}
              />
              <button
                style={{ ...S.btn, width: "auto", padding: "12px 20px" }}
                onClick={() => {
                  if (text.trim()) {
                    onSend(activeConv.id, text);
                    setText("");
                  }
                }}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UpgradeScreen({ currentUser, onUpgrade }) {
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("choose");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");

  const plans = [
    {
      id: "plus",
      name: "Plus ✨",
      price: "5€",
      priceNum: 5,
      color: "#4f9cf9",
      features: [
        "20 Credits alle 48h",
        "✨ Verification Badge",
        "Alles aus Free",
      ],
    },
    {
      id: "pro",
      name: "Pro ⭐",
      price: "25€",
      priceNum: 25,
      color: "#f59e0b",
      features: ["Unbegrenzte Nachrichten", "⭐ Pro Badge", "Alles aus Plus"],
    },
  ];

  const startPayment = (plan) => {
    setSelected(plan);
    const c = "SN-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    setCode(c);
    setStep("pay");
    setError("");
    setInputCode("");
  };

  const verify = () => {
    if (inputCode.trim().toUpperCase() === code) onUpgrade(selected.id);
    else
      setError(
        "Falscher Code. Bitte sende den exakten Code aus dem PayPal-Betreff.",
      );
  };

  if (step === "pay")
    return (
      <div style={S.page}>
        <h2 style={S.heading}>Zahlung – {selected.name}</h2>
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 20,
            padding: "24px 20px",
            maxWidth: 480,
          }}
        >
          <div
            style={{
              background: "#0d1a2a",
              border: "1px solid #1e3a5a",
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                color: "#4f9cf9",
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 12,
              }}
            >
              📋 So funktioniert es:
            </div>
            <div style={{ color: "#aaa", fontSize: 14, lineHeight: 2 }}>
              <div>1. Klicke auf „Zu PayPal" unten</div>
              <div>
                2. Sende <b style={{ color: "#fff" }}>{selected.price}/Monat</b>{" "}
                an <b style={{ color: "#fff" }}>paypal.me/AtaSocialNetwork</b>
              </div>
              <div>3. Schreibe im Betreff deinen Code:</div>
            </div>
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #f59e0b",
                borderRadius: 10,
                padding: "12px 20px",
                textAlign: "center",
                margin: "12px 0",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 4,
                color: "#f59e0b",
              }}
            >
              {code}
            </div>
            <div style={{ color: "#aaa", fontSize: 14 }}>
              4. Komm zurück und gib den Code unten ein
            </div>
          </div>
          <a
            href={`https://paypal.me/AtaSocialNetwork/${selected.priceNum}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#009cde",
              borderRadius: 12,
              padding: "14px",
              color: "#fff",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              marginBottom: 20,
            }}
          >
            💳 Zu PayPal ({selected.price}/Monat)
          </a>
          <input
            style={S.input}
            placeholder="z.B. SN-AB1234"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{
                ...S.btn,
                background: selected.color,
                border: "none",
                flex: 1,
              }}
              onClick={verify}
            >
              ✓ Bestätigen
            </button>
            <button
              style={{ ...S.btnOutline, padding: "12px 20px" }}
              onClick={() => setStep("choose")}
            >
              ← Zurück
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div style={S.page}>
      <h2 style={S.heading}>Upgrade dein Konto</h2>
      <p style={{ color: "#888", marginBottom: 24 }}>
        Aktueller Plan: <b style={{ color: "#fff" }}>{currentUser.plan}</b>
      </p>
      <div
        style={{
          background: "#111",
          border: "2px solid #1e1e1e",
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <h3 style={{ color: "#666", margin: "0 0 6px" }}>Free</h3>
        <div
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Kostenlos
        </div>
        {["5 Credits alle 48h", "Posts & Likes", "Basis-Profil"].map((f) => (
          <div key={f} style={{ color: "#666", fontSize: 14, marginBottom: 6 }}>
            ✓ {f}
          </div>
        ))}
        {currentUser.plan === "free" && (
          <div style={{ marginTop: 12, color: "#555", fontWeight: 700 }}>
            ✓ Aktiver Plan
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{
              flex: 1,
              minWidth: 200,
              background: "#111",
              border: `2px solid ${currentUser.plan === p.id ? p.color : "#1e1e1e"}`,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <h3 style={{ color: p.color, margin: "0 0 6px" }}>{p.name}</h3>
            <div
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 800,
                marginBottom: 16,
              }}
            >
              {p.price}
              <span style={{ fontSize: 14, color: "#888", fontWeight: 400 }}>
                /Monat
              </span>
            </div>
            {p.features.map((f) => (
              <div
                key={f}
                style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}
              >
                ✓ {f}
              </div>
            ))}
            {currentUser.plan === p.id ? (
              <div style={{ marginTop: 20, color: p.color, fontWeight: 700 }}>
                ✓ Aktiver Plan
              </div>
            ) : (
              <button
                style={{
                  ...S.btn,
                  marginTop: 20,
                  background: p.color,
                  border: "none",
                }}
                onClick={() => startPayment(p)}
              >
                Jetzt upgraden
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({ users, posts, onDelete, onSave }) {
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [planMap, setPlanMap] = useState({});
  const [badgeMap, setBadgeMap] = useState({});
  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={S.page}>
      <h2 style={S.heading}>⚙️ Admin Panel</h2>
      <div style={S.filterBar}>
        <button
          style={{
            ...S.filterBtn,
            ...(tab === "users" ? S.filterBtnActive : {}),
          }}
          onClick={() => setTab("users")}
        >
          Nutzer ({users.length})
        </button>
        <button
          style={{
            ...S.filterBtn,
            ...(tab === "posts" ? S.filterBtnActive : {}),
          }}
          onClick={() => setTab("posts")}
        >
          Posts ({posts.length})
        </button>
      </div>
      {tab === "users" && (
        <>
          <input
            style={S.input}
            placeholder="🔍 Nutzer suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filtered.map((u) => (
            <div
              key={u.id}
              style={{
                ...S.card,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={S.avatarSm}>{avatar(u)}</div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: "#fff", fontWeight: 600 }}>
                  {u.username} {u.badge && BADGE_ICONS[u.badge]}
                </div>
                <div style={{ color: "#888", fontSize: 12 }}>
                  {u.email} · {u.plan}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  style={S.select}
                  value={planMap[u.id] ?? u.plan}
                  onChange={(e) =>
                    setPlanMap((m) => ({ ...m, [u.id]: e.target.value }))
                  }
                >
                  <option value="free">Free</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                </select>
                <select
                  style={S.select}
                  value={badgeMap[u.id] ?? (u.badge || "")}
                  onChange={(e) =>
                    setBadgeMap((m) => ({ ...m, [u.id]: e.target.value }))
                  }
                >
                  <option value="">Kein Badge</option>
                  <option value="verified">✔️ Verifiziert</option>
                  <option value="plus">✨ Plus</option>
                  <option value="pro">⭐ Pro</option>
                  <option value="admin">⚙️ Admin</option>
                </select>
                <button
                  style={{
                    ...S.btn,
                    width: "auto",
                    padding: "7px 14px",
                    fontSize: 13,
                  }}
                  onClick={() =>
                    onSave(
                      u.id,
                      planMap[u.id] ?? u.plan,
                      badgeMap[u.id] ?? u.badge,
                    )
                  }
                >
                  Speichern
                </button>
                {u.id !== "admin" && (
                  <button style={S.deleteBtn} onClick={() => onDelete(u.id)}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      {tab === "posts" &&
        posts.map((p) => {
          const author = users.find((u) => u.id === p.authorId);
          return (
            <div key={p.id} style={S.card}>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>
                {author?.username} · {timeAgo(p.createdAt)}
              </div>
              <div style={{ color: "#e0e0e0" }}>{p.text}</div>
              <div style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
                ❤️ {p.likes?.length} · 💬 {p.comments?.length}
              </div>
            </div>
          );
        })}
    </div>
  );
}

const S = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    fontFamily: "'DM Sans', sans-serif",
    color: "#fff",
  },
  publicBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid #1e1e1e",
    background: "#111",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  publicHero: {
    textAlign: "center",
    padding: "40px 20px 32px",
    background: "linear-gradient(180deg,#111 0%,#0a0a0a 100%)",
    borderBottom: "1px solid #1e1e1e",
  },
  layout: {
    display: "flex",
    height: "calc(100vh - 60px)",
    overflow: "hidden",
    flexDirection: "column",
  },
  loader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#0a0a0a",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid #333",
    borderTop: "3px solid #4f9cf9",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  // Mobile top bar
  mobileBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    background: "#111",
    borderBottom: "1px solid #1e1e1e",
    position: "sticky",
    top: 0,
    zIndex: 200,
  },
  hamburger: {
    background: "none",
    border: "1px solid #333",
    borderRadius: 8,
    color: "#fff",
    fontSize: 18,
    padding: "4px 12px",
    cursor: "pointer",
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    background: "#111",
    borderRight: "1px solid #1e1e1e",
    padding: "20px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    overflowY: "auto",
    transform: "translateX(-100%)",
    transition: "transform 0.25s ease",
    zIndex: 150,
  },
  sidebarOpen: { transform: "translateX(0)" },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 140,
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    color: "#4f9cf9",
    letterSpacing: -0.5,
  },
  sideUserCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 10,
  },
  navBtn: {
    background: "none",
    border: "none",
    color: "#888",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 500,
    width: "100%",
    textAlign: "left",
  },
  navBtnActive: { background: "#1a2a3a", color: "#4f9cf9" },
  logoutBtn: {
    background: "none",
    border: "1px solid #333",
    color: "#666",
    padding: "9px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    marginTop: "auto",
  },
  main: { flex: 1, overflowY: "auto", paddingBottom: 70, width: "100%" },
  // Notification badge
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    background: "#ef4444",
    color: "#fff",
    borderRadius: 20,
    fontSize: 9,
    fontWeight: 800,
    padding: "1px 5px",
    minWidth: 16,
    textAlign: "center",
    lineHeight: "14px",
  },
  badgeSm: {
    position: "absolute",
    top: -4,
    right: -8,
    background: "#ef4444",
    color: "#fff",
    borderRadius: 20,
    fontSize: 8,
    fontWeight: 800,
    padding: "1px 4px",
    minWidth: 14,
    textAlign: "center",
  },
  // Bottom nav for mobile
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#111",
    borderTop: "1px solid #1e1e1e",
    display: "flex",
    justifyContent: "space-around",
    padding: "10px 0",
    zIndex: 130,
  },
  bottomNavBtn: {
    background: "none",
    border: "none",
    color: "#666",
    fontSize: 22,
    cursor: "pointer",
    padding: "4px 12px",
    borderRadius: 10,
    position: "relative",
  },
  bottomNavBtnActive: { color: "#4f9cf9" },
  authWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 20,
    padding: "32px 24px",
    width: "100%",
    maxWidth: 400,
  },
  authLogo: {
    fontSize: 28,
    fontWeight: 800,
    color: "#4f9cf9",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -1,
  },
  page: { padding: "20px 16px", maxWidth: 720, margin: "0 auto" },
  composer: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  },
  textarea: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "'DM Sans', sans-serif",
    width: "100%",
  },
  btn: {
    width: "100%",
    background: "#4f9cf9",
    border: "none",
    borderRadius: 10,
    padding: "12px",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnOutline: {
    background: "none",
    border: "1px solid #4f9cf9",
    borderRadius: 10,
    padding: "10px 20px",
    color: "#4f9cf9",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  catGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  catBtn: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 20,
    padding: "5px 13px",
    color: "#888",
    fontSize: 12,
    cursor: "pointer",
  },
  catBtnActive: {
    background: "#1a2a4a",
    border: "1px solid #4f9cf9",
    color: "#4f9cf9",
  },
  filterBar: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  filterBtn: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 20,
    padding: "5px 12px",
    color: "#888",
    fontSize: 12,
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "#4f9cf9",
    borderColor: "#4f9cf9",
    color: "#fff",
  },
  heading: { color: "#fff", margin: "0 0 16px", fontSize: 18, fontWeight: 700 },
  card: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 16,
    padding: "16px",
    marginBottom: 12,
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  postText: {
    color: "#ddd",
    fontSize: 15,
    lineHeight: 1.65,
    margin: "0 0 10px",
  },
  postActions: { display: "flex", gap: 16 },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: 0,
  },
  iconBtn: {
    background: "none",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    marginLeft: "auto",
    color: "#888",
  },
  tagRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  tag: {
    background: "#0d1f33",
    border: "1px solid #1e3a5a",
    color: "#4f9cf9",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
  },
  comment: {
    color: "#999",
    fontSize: 13,
    padding: "6px 0",
    borderBottom: "1px solid #1e1e1e",
  },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#4f9cf9,#a78bfa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  avatarLg: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#4f9cf9,#a78bfa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 22,
    margin: "0 auto 10px",
  },
  avatarXl: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#4f9cf9,#a78bfa)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 28,
    flexShrink: 0,
  },
  profileHero: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 20,
    padding: "20px 16px",
    display: "flex",
    gap: 16,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  userGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
  },
  userCard: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 16,
    padding: 16,
    textAlign: "center",
    cursor: "pointer",
  },
  convList: {
    width: 240,
    minWidth: 240,
    background: "#111",
    borderRight: "1px solid #1e1e1e",
    padding: "16px 12px",
    overflowY: "auto",
  },
  convItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    marginBottom: 4,
  },
  convItemActive: { background: "#1a2a3a" },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderBottom: "1px solid #1e1e1e",
    background: "#111",
  },
  msgArea: { flex: 1, overflowY: "auto", padding: "16px" },
  msgInput: {
    display: "flex",
    gap: 10,
    padding: "12px 16px",
    borderTop: "1px solid #1e1e1e",
    background: "#111",
  },
  bubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.5,
  },
  bubbleMe: {
    background: "#4f9cf9",
    color: "#fff",
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    background: "#1a1a1a",
    color: "#e0e0e0",
    border: "1px solid #2a2a2a",
    borderBottomLeftRadius: 4,
  },
  select: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "7px 10px",
    color: "#fff",
    fontSize: 12,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
    color: "#ef4444",
    fontSize: 14,
  },
  toast: {
    position: "fixed",
    bottom: 80,
    right: 16,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    zIndex: 9999,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  empty: {
    textAlign: "center",
    color: "#555",
    padding: "60px 20px",
    fontSize: 15,
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  button { transition: opacity 0.15s; font-family: 'DM Sans', sans-serif; }
  button:hover { opacity: 0.82; }
  input:focus, textarea:focus { border-color: #4f9cf9 !important; }

  /* Desktop: sidebar immer sichtbar, mobileBar und bottomNav versteckt */
  @media (min-width: 768px) {
    .mobile-bar-hide { display: none !important; }
    [data-mobile-bar] { display: none !important; }
  }

  /* Mobile: sidebar als Overlay */
  @media (max-width: 767px) {
    .conv-list-panel { width: 100% !important; min-width: unset !important; }
  }
`;
