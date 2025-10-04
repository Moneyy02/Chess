document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const chess = new Chess();
  const boardElement = document.querySelector(".chessboard");

  let draggedPiece = null;
  let sourceSquare = null;
  let playerRole = null; // will be set by server

  // map chess pieces to Unicode symbols
  const getPieceUnicode = (piece) => {
    const unicodePieces = {
      p: piece.color === "w" ? "♙" : "♙",
      r: piece.color === "w" ? "♖" : "♜",
      n: piece.color === "w" ? "♘" : "♞",
      b: piece.color === "w" ? "♗" : "♝",
      q: piece.color === "w" ? "♕" : "♛",
      k: piece.color === "w" ? "♔" : "♚",
    };
    return unicodePieces[piece.type];
  };

  // render the chessboard
  const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
      row.forEach((square, colIndex) => {
        const squareElement = document.createElement("div");
        squareElement.classList.add(
          "square",
          (rowIndex + colIndex) % 2 === 0 ? "light" : "dark"
        );
        squareElement.dataset.row = rowIndex;
        squareElement.dataset.col = colIndex;

        // add piece if it exists
        if (square) {
          const pieceElement = document.createElement("div");
          pieceElement.classList.add(
            "piece",
            square.color === "w" ? "white" : "black"
          );
          pieceElement.innerText = getPieceUnicode(square);

          // only draggable if it matches player's color
          pieceElement.draggable = playerRole === square.color;

          pieceElement.addEventListener("dragstart", (e) => {
            if (!pieceElement.draggable) return;
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: colIndex };
            e.dataTransfer.setData("text/plain", "");
          });

          pieceElement.addEventListener("dragend", () => {
            draggedPiece = null;
            sourceSquare = null;
          });

          squareElement.appendChild(pieceElement);
        }

        // allow dropping
        squareElement.addEventListener("dragover", (e) => e.preventDefault());
        squareElement.addEventListener("drop", (e) => {
          e.preventDefault();
          if (!draggedPiece) return;

          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          const move = {
            from: `${"abcdefgh"[sourceSquare.col]}${8 - sourceSquare.row}`,
            to: `${"abcdefgh"[targetSquare.col]}${8 - targetSquare.row}`,
            promotion: "q",
          };

          // try move locally
          const result = chess.move(move);
          if (result) {
            renderBoard();            // update local board
            socket.emit("move", move); // notify server
          }
        });

        boardElement.appendChild(squareElement);
      });
    });
  };

  // receive moves from server
  socket.on("move", (move) => {
    chess.move(move);
    renderBoard();
  });

  // assign player color
  socket.on("playerColor", (color) => {
    playerRole = color;
    console.log("You are player:", playerRole);
    renderBoard(); // re-render to make pieces draggable
  });

  socket.on("spectator", () => {
    playerRole = null;
    console.log("You are a spectator");
  });

  socket.on("invalidMove", (move) => {
    console.log("Invalid move:", move);
  });

  // initial render
  renderBoard();
});

