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
async function joinGame() {
  playerName = document.getElementById("playerName").value.trim();
  gameCode = document.getElementById("gameCode").value.trim();

  if (!playerName) {
    document.getElementById("loginError").innerText = "Introdu un nume!";
    return;
  }

  playerId = Math.random().toString(36).substring(2, 9);

  if (!gameCode) {
    // Creează joc nou → tu devii host
    gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    await set(ref(db, "games/" + gameCode), { 
      players: {}, 
      phase: "lobby", 
      hostId: playerId 
    });
  }

  await set(ref(db, "games/" + gameCode + "/players/" + playerId), {
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
  const gameRef = ref(db, "games/" + gameCode);
  onValue(gameRef, snap => {
    const game = snap.val();
    if (!game) return;
    const phase = game.phase;

    // buton Start vizibil doar pentru host
    const btnForce = document.getElementById("btnForceStart");
    if (game.hostId === playerId) {
      btnForce.style.display = "block";
    } else {
      btnForce.style.display = "none";
    }

    if (phase === "started") {
      show("game-screen");
      onValue(ref(db, "games/" + gameCode + "/players/" + playerId + "/word"), s => {
        const w = s.val();
        if (w) {
          const header = document.querySelector("#game-screen h2");

          // verificăm dacă jucătorul e impostor (are al doilea cuvânt din pereche)
          const pair = wordPairs.find(p => p.includes(w));
          if (pair && pair[1] === w) {
            header.innerText = "Tu ești IMPOSTORUL 👀";
          } else {
            header.innerText = "Cuvântul tău";
          }

          document.getElementById("yourWord").innerText = w;
        }
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

// 🔧 Force start (doar host)
async function forceStart() {
  const gameRef = ref(db, "games/" + gameCode);
  const snap = await get(gameRef);
  const gameData = snap.val();

  if (gameData.hostId !== playerId) {
    alert("Doar hostul poate porni jocul!");
    return;
  }

  const playersRef = ref(db, "games/" + gameCode + "/players");
  const playersSnap = await get(playersRef);
  const players = playersSnap.val() || {};
  startGame(players);
}

// 👇 Expunem funcțiile pentru HTML (onclick)
window.joinGame = joinGame;
window.setReady = setReady;
window.nextGame = nextGame;
window.forceStart = forceStart;
