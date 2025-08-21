// 🔧 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔧 Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDegjzhVr-EfJhcPYKRYds_P2Y8vROkfYE",
  authDomain: "impostor-game-d149f.firebaseapp.com",
  databaseURL: "https://impostor-game-d149f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "impostor-game-d149f",
  storageBucket: "impostor-game-d149f.appspot.com",
  messagingSenderId: "64487388916",
  appId: "1:64487388916:web:922577f573bd5c989e10a1"
};

// Inițializează Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let playerName, gameCode, playerId;

// 🔧 Schimbare ecran
function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// 🔧 Join sau Create Game
function joinGame() {
  playerName = document.getElementById("playerName").value.trim();
  gameCode = document.getElementById("gameCode").value.trim();

  if (!playerName) {
    document.getElementById("loginError").innerText = "Introdu un nume!";
    return;
  }

  if (!gameCode) {
    // Creează joc nou
    gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    set(ref(db, "games/" + gameCode), { players: {}, phase: "lobby" });
  }

  playerId = Math.random().toString(36).substring(2, 9);

  set(ref(db, "games/" + gameCode + "/players/" + playerId), {
    name: playerName,
    ready: false,
    word: ""
  });

  document.getElementById("lobbyCode").innerText = gameCode;
  show("lobby-screen");

  listenLobby();
  listenPhase();
}

// 🔧 Ascultă lobby
function listenLobby() {
  const playersRef = ref(db, "games/" + gameCode + "/players");
  onValue(playersRef, snapshot => {
    const players = snapshot.val() || {};
    const list = document.getElementById("playersList");
    list.innerHTML = "";
    let allReady = true;
    let count = 0;

    for (let id in players) {
      const li = document.createElement("li");
      li.innerText = players[id].name + (players[id].ready ? " ✅" : " ⏳");
      list.appendChild(li);
      count++;
      if (!players[id].ready) allReady = false;
    }

    // Auto-start dacă sunt >=4 și toți ready
    if (count >= 4 && allReady) {
      startGame(players);
    }
  });
}

// 🔧 Ascultă faza jocului
function listenPhase() {
  const phaseRef = ref(db, "games/" + gameCode + "/phase");
  onValue(phaseRef, snap => {
    const phase = snap.val();
    if (phase === "started") {
      show("game-screen");
      onValue(ref(db, "games/" + gameCode + "/players/" + playerId + "/word"), s => {
        const w = s.val();
        if (w) document.getElementById("yourWord").innerText = w;
      });
    } else if (phase === "lobby") {
      show("lobby-screen");
    }
  });
}

// 🔧 Marchează jucător ca ready
function setReady() {
  update(ref(db, "games/" + gameCode + "/players/" + playerId), { ready: true });
}

// 🔧 Start game
function startGame(players) {
  const ids = Object.keys(players);
  if (ids.length === 0) return;

  const impostorId = ids[Math.floor(Math.random() * ids.length)];
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

  ids.forEach(id => {
    const word = (id === impostorId) ? pair[1] : pair[0];
    update(ref(db, "games/" + gameCode + "/players/" + id), { word });
  });

  update(ref(db, "games/" + gameCode), { phase: "started", lastRoundAt: Date.now() });
}

// 🔧 Next game → înapoi în lobby
async function nextGame() {
  await update(ref(db, "games/" + gameCode + "/players/" + playerId), { ready: false, word: "" });
  await update(ref(db, "games/" + gameCode), { phase: "lobby" });
}

// 🔧 Force start (host)
async function forceStart() {
  const playersRef = ref(db, "games/" + gameCode + "/players");
  const snap = await get(playersRef);
  const players = snap.val() || {};
  startGame(players);
}

// 👇 Expunem funcțiile pe window pentru a putea fi apelate din HTML (onclick)
window.joinGame = joinGame;
window.setReady = setReady;
window.nextGame = nextGame;
window.forceStart = forceStart;
