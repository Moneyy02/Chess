const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w"; // white starts

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// main route
app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

// socket.io connection
io.on("connection", (uniquesocket) => {
  console.log("✅ A user connected:", uniquesocket.id);

  // assign player roles
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerColor", "w");
    console.log("🎮 White joined");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerColor", "b");
    console.log("🎮 Black joined");
  } else {
    uniquesocket.emit("spectator");
    console.log("👀 Spectator joined");
  }

  // handle disconnect
  uniquesocket.on("disconnect", () => {
    console.log("❌ Disconnected:", uniquesocket.id);
    if (uniquesocket.id === players.white) delete players.white;
    else if (uniquesocket.id === players.black) delete players.black;
  });

  // handle moves
  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("⚠️ Invalid move:", move);
        uniquesocket.emit("invalidMove", move);
      }
    } catch (err) {
      console.error("Error processing move:", err);
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
