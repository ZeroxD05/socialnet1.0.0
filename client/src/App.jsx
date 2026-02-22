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
const avatarChar = (u) => u?.avatar || u?.username?.[0]?.toUpperCase() || "?";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const PATHS = {
  home: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  search:
    "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z",
  message:
    "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  user: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  star: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
  settings:
    "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:
    "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75",
  heart:
    "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  comment:
    "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  send: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
  menu: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
  close: "M6 18L18 6M6 6l12 12",
  back: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18",
  check: "M4.5 12.75l6 6 9-13.5",
  edit: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
  trash:
    "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  follow:
    "M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z",
  unfollow:
    "M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
};

const Icon = ({ name, size = 20, color = "currentColor", filled = false }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? color : "none"}
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={PATHS[name] || ""} />
  </svg>
);

const Badge = ({ type }) => {
  const labels = { admin: "A", pro: "P", plus: "+", verified: "V" };
  const colors = { admin: "#666", pro: "#aaa", plus: "#aaa", verified: "#aaa" };
  if (!type || !labels[type]) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 15,
        height: 15,
        borderRadius: "50%",
        background: colors[type],
        color: "#000",
        fontSize: 8,
        fontWeight: 800,
        marginLeft: 3,
        flexShrink: 0,
      }}
    >
      {labels[type]}
    </span>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
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
  const [menuOpen, setMenuOpen] = useState(false);
  const activeConvRef = useRef(null);
  const seenRef = useRef({});
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
    } catch {}
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
    } catch {
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
  useEffect(() => {
    const t = setInterval(loadPublic, 10000);
    return () => clearInterval(t);
  }, []);

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
        let count = 0;
        for (const conv of cs) {
          const msgs = (conv.messages || []).filter(
            (m) => m.senderId !== currentUser.id,
          );
          count += Math.max(0, msgs.length - (seenRef.current[conv.id] || 0));
        }
        setUnreadCount(count);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [token, currentUser]);

  const markSeen = (conv) => {
    if (!conv || !currentUser) return;
    seenRef.current[conv.id] = (conv.messages || []).filter(
      (m) => m.senderId !== currentUser.id,
    ).length;
    let count = 0;
    for (const c of conversations) {
      const msgs = (c.messages || []).filter(
        (m) => m.senderId !== currentUser.id,
      );
      count += Math.max(0, msgs.length - (seenRef.current[c.id] || 0));
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
      showToast(`Willkommen, ${user.username}!`, "success");
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
      showToast("Willkommen bei Orbix!", "success");
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
    seenRef.current = {};
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
      setMenuOpen(false);
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
      showToast("Gespeichert!", "success");
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
      showToast("Gelöscht", "success");
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
    showToast(`Upgrade auf ${plan} erfolgreich!`, "success");
    setScreen("feed");
  };

  const navTo = (s) => {
    setScreen(s);
    setMenuOpen(false);
    if (s !== "profile") setViewUser(null);
  };

  const NAV = [
    { id: "feed", icon: "home", label: "Feed" },
    { id: "explore", icon: "search", label: "Erkunden" },
    {
      id: "messages",
      icon: "message",
      label: "Nachrichten",
      badge: unreadCount,
    },
    { id: "profile", icon: "user", label: "Profil" },
    { id: "upgrade", icon: "star", label: "Upgrade" },
    ...(currentUser?.id === "admin"
      ? [{ id: "admin", icon: "settings", label: "Admin" }]
      : []),
  ];

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

      {/* Sidebar overlay – z-index 300, above header (100) */}
      {menuOpen && <div style={S.overlay} onClick={() => setMenuOpen(false)} />}
      <aside style={{ ...S.sidebar, ...(menuOpen ? S.sidebarOpen : {}) }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={S.logo}>Orbix</div>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#888",
              display: "flex",
            }}
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="close" size={18} color="#888" />
          </button>
        </div>
        <div style={S.sideUserCard}>
          <div style={S.avatarSm}>{avatarChar(currentUser)}</div>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
              }}
            >
              {currentUser.username}
              <Badge type={currentUser.badge} />
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>
              {currentUser.plan === "pro"
                ? "Pro"
                : currentUser.plan === "plus"
                  ? `Plus · ${currentUser.credits}cr`
                  : `Free · ${currentUser.credits}cr`}
            </div>
          </div>
        </div>
        <nav
          style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
        >
          {NAV.map((i) => (
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
                  flexShrink: 0,
                }}
              >
                <Icon
                  name={i.icon}
                  size={18}
                  color={screen === i.id ? "#4f9cf9" : "#888"}
                />
                {i.badge > 0 && (
                  <span style={S.badge}>{i.badge > 99 ? "99+" : i.badge}</span>
                )}
              </span>
              {i.label}
            </button>
          ))}
        </nav>
        <button style={S.logoutBtn} onClick={logout}>
          <Icon name="logout" size={16} color="#666" /> Abmelden
        </button>
      </aside>

      {/* Top bar – z-index 100 */}
      <div style={S.topBar}>
        <div style={S.logo}>Orbix</div>
        <button style={S.hamburger} onClick={() => setMenuOpen((o) => !o)}>
          <Icon name="menu" size={20} color="#fff" />
        </button>
      </div>

      {/* Main */}
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
              setMenuOpen(false);
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
              setMenuOpen(false);
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

      {/* Bottom nav – hidden on desktop via CSS class */}
      <nav className="bottom-nav" style={S.bottomNav}>
        {NAV.slice(0, 5).map((i) => (
          <button
            key={i.id}
            style={{
              ...S.bottomNavBtn,
              ...(screen === i.id ? S.bottomNavActive : {}),
            }}
            onClick={() => navTo(i.id)}
          >
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Icon
                name={i.icon}
                size={22}
                color={screen === i.id ? "#4f9cf9" : "#555"}
              />
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  const colors = { info: "#4f9cf9", success: "#22c55e", error: "#ef4444" };
  return (
    <div style={{ ...S.toast, background: colors[toast.type] }}>
      {toast.msg}
    </div>
  );
}

// ── Public Feed ───────────────────────────────────────────────────────────────
function PublicFeedScreen({ users, posts, onLoginRequired, onSwitchRegister }) {
  const [filter, setFilter] = useState("all");
  const getUser = (id) => users.find((u) => u.id === id);
  const filtered = posts
    .filter((p) => filter === "all" || p.categories?.includes(filter))
    .filter((p) => !!getUser(p.authorId));

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.publicBar}>
        <div style={S.logo}>Orbix</div>
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
            fontSize: "clamp(22px,5vw,36px)",
            fontWeight: 800,
            margin: "0 0 10px",
            letterSpacing: -1,
          }}
        >
          Willkommen bei <span style={{ color: "#4f9cf9" }}>Orbix</span>
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
        {filtered.length === 0 && <div style={S.empty}>Noch keine Posts</div>}
        {filtered.map((p) => {
          const author = getUser(p.authorId);
          return (
            <div key={p.id} style={S.card}>
              <div style={S.postHeader}>
                <div style={S.avatarSm}>{avatarChar(author)}</div>
                <div>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {author.username}
                    <Badge type={author.badge} />
                  </div>
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
                  <Icon name="heart" size={16} color="#555" />{" "}
                  {p.likes?.length || 0}
                </button>
                <button style={S.actionBtn} onClick={onLoginRequired}>
                  <Icon name="comment" size={16} color="#555" />{" "}
                  {p.comments?.length || 0}
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
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={onLoginRequired}
              >
                <Icon name="lock" size={13} color="#4f9cf9" /> Einloggen um zu
                interagieren
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div style={S.authWrap}>
      <div style={S.authCard}>
        <div style={S.authLogo}>Orbix</div>
        <p style={{ color: "#888", textAlign: "center", marginBottom: 24 }}>
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
            marginTop: 10,
          }}
        >
          Admin: atahh2005@gmail.com / Atailayda05
        </p>
      </div>
    </div>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
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
        <div style={S.authLogo}>Orbix</div>
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

// ── Feed ──────────────────────────────────────────────────────────────────────
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
          <div style={S.avatarSm}>{avatarChar(currentUser)}</div>
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
      {filtered.length === 0 && <div style={S.empty}>Keine Posts</div>}
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
                {avatarChar(author)}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onClick={() => onViewUser(author)}
                >
                  {author.username}
                  <Badge type={author.badge} />
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {timeAgo(p.createdAt)}
                </div>
              </div>
              {author.id !== currentUser.id && (
                <button style={S.iconBtn} onClick={() => onMessage(author.id)}>
                  <Icon name="send" size={14} color="#888" />
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
                <Icon
                  name="heart"
                  size={16}
                  color={liked ? "#ef4444" : "#555"}
                  filled={liked}
                />{" "}
                {p.likes?.length || 0}
              </button>
              <button
                style={S.actionBtn}
                onClick={() =>
                  setShowComment(showComment === p.id ? null : p.id)
                }
              >
                <Icon name="comment" size={16} color="#555" />{" "}
                {p.comments?.length || 0}
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
                    style={{
                      ...S.btn,
                      width: "auto",
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={() => {
                      if (commentText.trim()) {
                        onComment(p.id, commentText);
                        setCommentText("");
                      }
                    }}
                  >
                    <Icon name="send" size={15} color="#fff" />
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

// ── Explore ───────────────────────────────────────────────────────────────────
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
        placeholder="Nutzer suchen..."
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
            <div style={S.avatarLg}>{avatarChar(u)}</div>
            <div
              style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {u.username}
              <Badge type={u.badge} />
            </div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
              {u.plan}
            </div>
            <div style={{ ...S.tagRow, justifyContent: "center" }}>
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

// ── Profile ───────────────────────────────────────────────────────────────────
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
        <div style={S.avatarXl}>{avatarChar(viewUser)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "clamp(16px,4vw,22px)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {viewUser.username}
            <Badge type={viewUser.badge} />
          </h2>
          <div style={{ color: "#888", fontSize: 13, margin: "4px 0 8px" }}>
            {viewUser.plan === "pro"
              ? "Pro"
              : viewUser.plan === "plus"
                ? "Plus"
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
                  padding: "9px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() => onFollow(viewUser.id)}
              >
                <Icon
                  name={isFollowing ? "unfollow" : "follow"}
                  size={15}
                  color={isFollowing ? "#4f9cf9" : "#fff"}
                />
                {isFollowing ? "Entfolgen" : "Folgen"}
              </button>
              <button
                style={{
                  ...S.btnOutline,
                  padding: "9px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={() => onMessage(viewUser.id)}
              >
                <Icon name="send" size={15} color="#4f9cf9" /> Nachricht
              </button>
            </div>
          )}
          {isOwn && !editing && (
            <button
              style={{
                ...S.btn,
                marginTop: 14,
                width: "auto",
                padding: "9px 18px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => setEditing(true)}
            >
              <Icon name="edit" size={15} color="#fff" /> Bearbeiten
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
                <Icon
                  name="heart"
                  size={16}
                  color={liked ? "#ef4444" : "#555"}
                  filled={liked}
                />{" "}
                {p.likes?.length || 0}
              </button>
              <button
                style={S.actionBtn}
                onClick={() =>
                  setShowComment(showComment === p.id ? null : p.id)
                }
              >
                <Icon name="comment" size={16} color="#555" />{" "}
                {p.comments?.length || 0}
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
                    style={{
                      ...S.btn,
                      width: "auto",
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onClick={() => {
                      if (commentText.trim()) {
                        onComment(p.id, commentText);
                        setCommentText("");
                      }
                    }}
                  >
                    <Icon name="send" size={15} color="#fff" />
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

// ── Messages ──────────────────────────────────────────────────────────────────
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
      <div
        style={{ ...S.convList, ...(activeConv ? { display: "none" } : {}) }}
        className="conv-list"
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
          return (
            <div
              key={c.id}
              style={{
                ...S.convItem,
                ...(activeConv?.id === c.id ? S.convItemActive : {}),
              }}
              onClick={() => setActiveConv(c)}
            >
              <div style={S.avatarSm}>{avatarChar(other)}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {other.username}
                  <Badge type={other.badge} />
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
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  marginRight: 8,
                }}
                onClick={() => setActiveConv(null)}
              >
                <Icon name="back" size={20} color="#888" />
              </button>
              {(() => {
                const other = getOther(activeConv);
                return other ? (
                  <>
                    <div
                      style={{ ...S.avatarSm, cursor: "pointer" }}
                      onClick={() => onViewUser(other)}
                    >
                      {avatarChar(other)}
                    </div>
                    <span
                      style={{
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                      onClick={() => onViewUser(other)}
                    >
                      {other.username}
                      <Badge type={other.badge} />
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
                style={{
                  ...S.btn,
                  width: "auto",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                }}
                onClick={() => {
                  if (text.trim()) {
                    onSend(activeConv.id, text);
                    setText("");
                  }
                }}
              >
                <Icon name="send" size={18} color="#fff" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Upgrade ───────────────────────────────────────────────────────────────────
function UpgradeScreen({ currentUser, onUpgrade }) {
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("choose");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const plans = [
    {
      id: "plus",
      name: "Plus",
      price: "5€",
      priceNum: 5,
      color: "#4f9cf9",
      features: ["20 Credits alle 48h", "Verification Badge", "Alles aus Free"],
    },
    {
      id: "pro",
      name: "Pro",
      price: "25€",
      priceNum: 25,
      color: "#aaa",
      features: ["Unbegrenzte Nachrichten", "Pro Badge", "Alles aus Plus"],
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
    else setError("Falscher Code.");
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
              So funktioniert es:
            </div>
            <div style={{ color: "#aaa", fontSize: 14, lineHeight: 2 }}>
              <div>1. Klicke auf „Zu PayPal"</div>
              <div>
                2. Sende <b style={{ color: "#fff" }}>{selected.price}/Monat</b>{" "}
                an <b style={{ color: "#fff" }}>paypal.me/AtaSocialNetwork</b>
              </div>
              <div>3. Schreibe im Betreff diesen Code:</div>
            </div>
            <div
              style={{
                background: "#0a0a0a",
                border: "1px solid #555",
                borderRadius: 10,
                padding: "12px 20px",
                textAlign: "center",
                margin: "12px 0",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 4,
                color: "#fff",
              }}
            >
              {code}
            </div>
            <div style={{ color: "#aaa", fontSize: 14 }}>
              4. Komm zurück und gib den Code ein
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
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 12,
              padding: 14,
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              marginBottom: 20,
            }}
          >
            <Icon name="card" size={20} color="#fff" /> Zu PayPal (
            {selected.price}/Monat)
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
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
              onClick={verify}
            >
              <Icon name="check" size={16} color="#fff" /> Bestätigen
            </button>
            <button
              style={{ ...S.btnOutline, padding: "12px 20px" }}
              onClick={() => setStep("choose")}
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div style={S.page}>
      <h2 style={S.heading}>Upgrade</h2>
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
          <div
            key={f}
            style={{
              color: "#666",
              fontSize: 14,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="check" size={13} color="#444" />
            {f}
          </div>
        ))}
        {currentUser.plan === "free" && (
          <div style={{ marginTop: 12, color: "#555", fontWeight: 700 }}>
            Aktiver Plan
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
              border: `2px solid ${currentUser.plan === p.id ? "#444" : "#1e1e1e"}`,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <h3 style={{ color: "#fff", margin: "0 0 6px" }}>{p.name}</h3>
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
                style={{
                  color: "#aaa",
                  fontSize: 14,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="check" size={13} color="#555" />
                {f}
              </div>
            ))}
            {currentUser.plan === p.id ? (
              <div style={{ marginTop: 20, color: "#aaa", fontWeight: 700 }}>
                Aktiver Plan
              </div>
            ) : (
              <button
                style={{
                  ...S.btn,
                  marginTop: 20,
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  fontWeight: 700,
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

// ── Admin Panel ───────────────────────────────────────────────────────────────
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
      <h2 style={S.heading}>Admin Panel</h2>
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
            placeholder="Nutzer suchen..."
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
              <div style={S.avatarSm}>{avatarChar(u)}</div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {u.username}
                  <Badge type={u.badge} />
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
                  <option value="verified">Verifiziert</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                  <option value="admin">Admin</option>
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
                    <Icon name="trash" size={15} color="#ef4444" />
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
                {p.likes?.length} Likes · {p.comments?.length} Kommentare
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    fontFamily: "'DM Sans', sans-serif",
    color: "#fff",
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
    border: "3px solid #222",
    borderTop: "3px solid #fff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  // Top bar – z 100
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    background: "#111",
    borderBottom: "1px solid #1e1e1e",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: { fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  hamburger: {
    background: "none",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "5px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  // Sidebar – z 300 (above header)
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
    zIndex: 300,
  },
  sidebarOpen: { transform: "translateX(0)" },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 200,
  },
  sideUserCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 8,
  },
  navBtn: {
    background: "none",
    border: "none",
    color: "#666",
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
  navBtnActive: { background: "#1a1a1a", color: "#fff" },
  logoutBtn: {
    background: "none",
    border: "1px solid #222",
    color: "#555",
    padding: "9px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13,
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
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
  // Main
  main: { minHeight: "calc(100vh - 60px)", paddingBottom: 70 },
  // Bottom nav
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
    cursor: "pointer",
    padding: "4px 12px",
    borderRadius: 10,
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  bottomNavActive: {},
  // Public
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
  // Auth
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
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -1,
  },
  // Content
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
    background: "#fff",
    border: "none",
    borderRadius: 10,
    padding: 12,
    color: "#000",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnOutline: {
    background: "none",
    border: "1px solid #333",
    borderRadius: 10,
    padding: "10px 20px",
    color: "#fff",
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
    color: "#666",
    fontSize: 12,
    cursor: "pointer",
  },
  catBtnActive: {
    background: "#2a2a2a",
    border: "1px solid #555",
    color: "#fff",
  },
  filterBar: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  filterBtn: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 20,
    padding: "5px 12px",
    color: "#666",
    fontSize: 12,
    cursor: "pointer",
  },
  filterBtnActive: { background: "#fff", , color: "#000" },
  heading: { color: "#fff", margin: "0 0 16px", fontSize: 18, fontWeight: 700 },
  card: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  postText: {
    color: "#ccc",
    fontSize: 15,
    lineHeight: 1.65,
    margin: "0 0 10px",
  },
  postActions: { display: "flex", gap: 16 },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
  },
  iconBtn: {
    background: "none",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    marginLeft: "auto",
    color: "#666",
    display: "flex",
    alignItems: "center",
  },
  tagRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  tag: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    color: "#888",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
  },
  comment: {
    color: "#888",
    fontSize: 13,
    padding: "6px 0",
    borderBottom: "1px solid #1e1e1e",
  },
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
    color: "#fff",
  },
  avatarLg: {
    width: 54,
    height: 54,
    borderRadius: "50%",
    background: "#2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 22,
    margin: "0 auto 10px",
    color: "#fff",
  },
  avatarXl: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    background: "#2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 28,
    flexShrink: 0,
    color: "#fff",
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
    gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
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
  convItemActive: { background: "#1a1a1a" },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderBottom: "1px solid #1e1e1e",
    background: "#111",
  },
  msgArea: { flex: 1, overflowY: "auto", padding: 16 },
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
  bubbleMe: { background: "#fff", color: "#000", borderBottomRightRadius: 4 },
  bubbleThem: {
    background: "#1a1a1a",
    color: "#ccc",
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
    border: "1px solid #333",
    borderRadius: 8,
    padding: "7px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  toast: {
    position: "fixed",
    bottom: 80,
    right: 16,
    color: "#000",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    zIndex: 9999,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  empty: {
    textAlign: "center",
    color: "#444",
    padding: "60px 20px",
    fontSize: 15,
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  button { transition: opacity 0.15s; font-family: 'DM Sans', sans-serif; }
  button:hover { opacity: 0.75; }
  input:focus, textarea:focus { border-color: #444 !important; outline: none; }

  /* Desktop: hide bottom nav */
  @media (min-width: 768px) {
    .bottom-nav { display: none !important; }
    main { padding-bottom: 0 !important; }
  }

  /* Mobile: conv list full width */
  @media (max-width: 767px) {
    .conv-list { width: 100% !important; min-width: unset !important; }
  }
`;
