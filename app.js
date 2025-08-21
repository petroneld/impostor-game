// 🔧 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let playerName, gameCode, playerId, isHost = false;

// schimbă ecranul
function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// preia parametru game din URL (dacă există)
function getGameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("game");
}

// Join / Create Game
window.joinGame = async function() {
  playerName = document.getElementById("playerName").value.trim();
  gameCode = document.getElementById("gameCode").value.trim() || getGameFromUrl();

  if (!playerName) {
    document.getElementById("loginError").innerText = "Introdu un nume!";
    return;
  }

  if (!gameCode) {
    // creează un joc nou
    gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    isHost = true;
    await set(ref(db, "games/" + gameCode), { players: {} });
  } else {
    // verifică dacă jocul există
    const snap = await get(child(ref(db), "games/" + gameCode));
    if (!snap.exists()) {
      document.getElementById("loginError").innerText = "Cod joc invalid!";
      return;
    }
  }

  playerId = Math.random().toString(36).substring(2, 9);

  await set(ref(db, "games/" + gameCode + "/players/" + playerId), {
    name: playerName,
    ready: false,
    word: ""
  });

  document.getElementById("lobbyCode").innerText = gameCode;
  show("lobby-screen");

  // doar hostul vede butonul start + QR
  document.getElementById("btnForceStart").style.display = isHost ? "block" : "none";
  if (isHost) {
    const link = "https://snazzy-marigold-d6fa08.netlify.app/?game=" + gameCode;
    document.getElementById("qrContainer").style.display = "block";
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: link, width: 200, height: 200 });
  }

  listenLobby();
};

// Ascultă lobby-ul
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

    // auto start doar dacă e host
    if (isHost && count >= 4 && allReady) {
      startGame(players);
    }
  });
}

// Marchează jucător ca ready
