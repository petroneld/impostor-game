// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDegjzhVr-EfJhcPYKRYds_P2Y8vROkfYE",
  authDomain: "impostor-game-d149f.firebaseapp.com",
  databaseURL: "https://impostor-game-d149f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "impostor-game-d149f",
  storageBucket: "impostor-game-d149f.appspot.com",
  messagingSenderId: "64487388916",
  appId: "1:64487388916:web:922577f573bd5c989e10a1"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let playerName, gameCode, playerId, isHost = false;

// Utils
function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}
function getGameFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('game');
}
window.prefillGameCode = function() {
  const urlGame = getGameFromUrl();
  if (urlGame) {
    document.getElementById("gameCode").value = urlGame;
  }
};

// Join game
window.joinGame = async function() {
  playerName = document.getElementById("playerName").value.trim();
  gameCode = getGameFromUrl() || document.getElementById("gameCode").value.trim();

  if (!playerName) {
    document.getElementById("loginError").innerText = "Introdu un nume!";
    return;
  }

  // Dacă nu există cod => ești host
  if (!gameCode) {
    gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    isHost = true;
    await set(ref(db, "games/" + gameCode), { players: {} });
  }

  playerId = Math.random().toString(36).substring(2, 9);
  await set(ref(db, "games/" + gameCode + "/players/" + playerId), {
    name: playerName,
    ready: false,
    word: ""
  });

  document.getElementById("lobbyCode").innerText = gameCode;

  // QR cu link (doar hostul îl vede)
  if (isHost) {
    const qr = new QRious({
      element: document.createElement("canvas"),
      size: 200,
      value: `${window.location.origin}${window.location.pathname}?game=${gameCode}`
    });
    const qrDiv = document.getElementById("qrCode");
    qrDiv.innerHTML = "";
    qrDiv.appendChild(qr.element);
  }

  // Ascund buton start dacă nu sunt host
  if (!isHost) document.getElementById("startBtn").style.display = "none";

  show("lobby-screen");
  listenLobby();
};

// Lobby listener
function listenLobby() {
  const playersRef = ref(db, "games/" + gameCode + "/players");
  onValue(playersRef, snapshot => {
    const players = snapshot.val() || {};
    const list = document.getElementById("playersList");
    list.innerHTML = "";
    for (let id in players) {
      const li = document.createElement("li");
      li.innerText = players[id].name + (players[id].ready ? " ✅" : " ⏳");
      list.appendChild(li);
    }
  });
}

// Ready
window.setReady = function() {
  update(ref(db, "games/" + gameCode + "/players/" + playerId), { ready: true });
};

// Host start
window.forceStart = async function() {
  if (!isHost) return;
  const snap = await get(ref(db, "games/" + gameCode + "/players"));
  const players = snap.val() || {};
  startGame(players);
};

// Game start
function startGame(players) {
  const ids = Object.keys(players);
  const impostorId = ids[Math.floor(Math.random() * ids.length)];
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

  ids.forEach(id => {
    let word = (id === impostorId) ? pair[1] : pair[0];
    update(ref(db, "games/" + gameCode + "/players/" + id), { word, impostor: id === impostorId });
  });

  show("game-screen");

  onValue(ref(db, "games/" + gameCode + "/players/" + playerId), snap => {
    const me = snap.val();
    if (!me) return;
    document.getElementById("yourWord").innerText = me.word;
    document.getElementById("roleTitle").innerText =
      me.impostor ? "Tu ești impostorul 👀" : "Cuvântul tău";
  });
}

// Next game
window.nextGame = function() {
  update(ref(db, "games/" + gameCode + "/players/" + playerId), { ready: false, word: "", impostor: false });
  show("lobby-screen");
};
