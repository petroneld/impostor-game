// 🔧 Firebase SDK (trebuie să-ți faci proiect pe console.firebase.google.com)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// TODO: înlocuiește cu datele tale Firebase
const firebaseConfig = {
    const firebaseConfig = {
        apiKey: "AIzaSyDegjzhVr-EfJhcPYKRYds_P2Y8vROkfYE",
        authDomain: "impostor-game-d149f.firebaseapp.com",
        projectId: "impostor-game-d149f",
        storageBucket: "impostor-game-d149f.firebasestorage.app",
        messagingSenderId: "64487388916",
        appId: "1:64487388916:web:922577f573bd5c989e10a1"
      };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let playerName, gameCode, playerId;

function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Join / Create Game
window.joinGame = function() {
  playerName = document.getElementById("playerName").value.trim();
  gameCode = document.getElementById("gameCode").value.trim();

  if (!playerName) {
    document.getElementById("loginError").innerText = "Introdu un nume!";
    return;
  }

  if (!gameCode) {
    gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    set(ref(db, "games/" + gameCode), { players: {} });
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
};

// Ascultă lobby
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

    if (count >= 4 && allReady) {
      startGame(players);
    }
  });
}

// Set ready
window.setReady = function() {
  update(ref(db, "games/" + gameCode + "/players/" + playerId), { ready: true });
};

// Start game
function startGame(players) {
  const ids = Object.keys(players);
  const impostorId = ids[Math.floor(Math.random() * ids.length)];

  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];

  ids.forEach(id => {
    let word = (id === impostorId) ? pair[1] : pair[0];
    update(ref(db, "games/" + gameCode + "/players/" + id), { word });
  });

  show("game-screen");
  onValue(ref(db, "games/" + gameCode + "/players/" + playerId + "/word"), snap => {
    document.getElementById("yourWord").innerText = snap.val();
  });
}

// Next game
window.nextGame = function() {
  update(ref(db, "games/" + gameCode + "/players/" + playerId), { ready: false, word: "" });
  show("lobby-screen");
}
