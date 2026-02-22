# SocialNet

## Lokal starten (Entwicklung)

### 1. Server starten
```bash
cd server
npm install
node index.js
```

### 2. Client starten (neues Terminal)
```bash
cd client
npm install
npm run dev
```

→ Öffne http://localhost:5173

**Admin Login:** admin@socialnet.de / admin123

---

## Im Internet deployen (Railway)

### 1. GitHub Repository erstellen
- Geh auf https://github.com/new
- Repository erstellen (z.B. "socialnet")

### 2. Code hochladen
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USERNAME/socialnet.git
git push -u origin main
```

### 3. Railway Setup
- Geh auf https://railway.app
- "New Project" → "Deploy from GitHub repo"
- Dein socialnet Repository auswählen
- Warte bis Deploy fertig ist
- Unter "Settings" → "Networking" → "Generate Domain"

### 4. Frontend API URL anpassen
In `client/src/App.jsx` Zeile 1:
```js
const API = "/api"; // bleibt so – Railway handled das
```

In `client/vite.config.js` für Production den Proxy entfernen oder die Railway URL eintragen.

### Umgebungsvariablen auf Railway setzen:
- `JWT_SECRET` = irgendein langer zufälliger String
- `NODE_ENV` = production

---

## Features
- ✅ Registrierung & Login (JWT)
- ✅ Feed mit Posts, Likes, Kommentaren  
- ✅ Nutzer erkunden & folgen
- ✅ Direktnachrichten mit Credit-System
- ✅ Free (5 Credits/48h), Plus (20/48h), Pro (unbegrenzt)
- ✅ Verification Badges
- ✅ Admin Panel (Plan ändern, Badge vergeben, User löschen)
- ✅ SQLite Datenbank (persistent, serverübergreifend)
