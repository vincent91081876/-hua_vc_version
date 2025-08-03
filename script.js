document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('gameBoard');
    const moveCountDisplay = document.getElementById('moveCount');
    const gameTimeDisplay = document.getElementById('gameTime');
    const generateGameBtn = document.getElementById('generateGameBtn');
    const resetGameBtn = document.getElementById('resetGameBtn');
    const boardSizeInput = document.getElementById('boardSize');
    const winMessage = document.getElementById('winMessage');
    const closeWinMessageBtn = document.getElementById('closeWinMessage');

    let board = [];
    let N = 4; // Default board size
    let emptyTilePos = { row: 0, col: 0 };
    let moveCount = 0;
    let timerInterval = null;
    let startTime = 0;
    let gameStarted = false;

    // --- Game Initialization and Rendering ---

    function initializeGame(size) {
        N = size;
        moveCount = 0;
        updateMoveCount();
        stopTimer();
        resetTimer();
        gameStarted = false;
        winMessage.classList.add('hidden');

        // Set CSS variables for dynamic sizing
        document.documentElement.style.setProperty('--board-size', N);
        // Recalculate tile size based on new N
        // This is handled by CSS using vmin, but explicitly setting it here ensures consistency
        // For more precise control, one might calculate and set --tile-size directly in JS
        // For now, relying on CSS's vmin and calc() is sufficient for responsiveness.

        generateSolvableBoard();
        renderBoard();
    }

    function generateSolvableBoard() {
        const totalTiles = N * N;
        let tiles = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1);
        tiles.push(0); // 0 represents the empty tile

        let shuffledTiles;
        do {
            shuffledTiles = shuffleArray(tiles.slice());
        } while (!isSolvable(shuffledTiles));

        board = [];
        let k = 0;
        for (let i = 0; i < N; i++) {
            board[i] = [];
            for (let j = 0; j < N; j++) {
                board[i][j] = shuffledTiles[k];
                if (shuffledTiles[k] === 0) {
                    emptyTilePos = { row: i, col: j };
                }
                k++;
            }
        }
    }

    // Fisher-Yates (Knuth) shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Check if the puzzle is solvable (standard 15-puzzle solvability)
    // For N x N puzzle:
    // If N is odd, number of inversions must be even.
    // If N is even, (number of inversions + row of empty tile from bottom) must be even.
    function isSolvable(tilesArray) {
        const flatTiles = tilesArray.filter(val => val !== 0); // Exclude empty tile for inversion count
        let inversions = 0;
        for (let i = 0; i < flatTiles.length - 1; i++) {
            for (let j = i + 1; j < flatTiles.length; j++) {
                if (flatTiles[i] > flatTiles[j]) {
                    inversions++;
                }
            }
        }

        const emptyRowFromBottom = N - emptyTilePos.row; // 1-indexed from bottom

        if (N % 2 === 1) { // Odd grid
            return inversions % 2 === 0;
        } else { // Even grid
            return (inversions + emptyRowFromBottom) % 2 === 0;
        }
    }

    function renderBoard() {
        gameBoard.innerHTML = ''; // Clear existing tiles
        gameBoard.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${N}, 1fr)`;

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const tileValue = board[r][c];
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.dataset.row = r;
                tile.dataset.col = c;
                tile.dataset.value = tileValue;

                if (tileValue === 0) {
                    tile.classList.add('empty');
                    tile.textContent = '';
                } else {
                    tile.textContent = tileValue;
                }
                gameBoard.appendChild(tile);
            }
        }
        // Re-attach event listeners to new tiles
        attachTileEventListeners();
    }

    function attachTileEventListeners() {
        document.querySelectorAll('.tile:not(.empty)').forEach(tile => {
            tile.removeEventListener('click', handleTileClick); // Prevent duplicate listeners
            tile.addEventListener('click', handleTileClick);
        });
    }

    // --- Game Logic (Movement) ---

    function handleTileClick(event) {
        if (winMessage.classList.contains('hidden') === false) return; // Don't allow moves if win message is up

        const clickedTile = event.target;
        const clickedRow = parseInt(clickedTile.dataset.row);
        const clickedCol = parseInt(clickedTile.dataset.col);

        // Check if clicked tile is in the same row or column as the empty tile
        const isSameRow = clickedRow === emptyTilePos.row;
        const isSameCol = clickedCol === emptyTilePos.col;

        if (!isSameRow && !isSameCol) {
            return; // Not a valid move
        }

        if (!gameStarted) {
            startGameTimer();
            gameStarted = true;
        }

        let tilesToMove = [];
        if (isSameRow) {
            // Horizontal movement
            const startCol = Math.min(clickedCol, emptyTilePos.col);
            const endCol = Math.max(clickedCol, emptyTilePos.col);
            for (let c = startCol; c <= endCol; c++) {
                tilesToMove.push({ row: clickedRow, col: c, value: board[clickedRow][c] });
            }
        } else { // isSameCol
            // Vertical movement
            const startRow = Math.min(clickedRow, emptyTilePos.row);
            const endRow = Math.max(clickedRow, emptyTilePos.row);
            for (let r = startRow; r <= endRow; r++) {
                tilesToMove.push({ row: r, col: clickedCol, value: board[r][clickedCol] });
            }
        }

        // Perform the segment shift
        const newBoard = board.map(row => [...row]); // Create a deep copy
        const originalEmptyValue = newBoard[emptyTilePos.row][emptyTilePos.col]; // Should be 0

        if (isSameRow) {
            if (clickedCol < emptyTilePos.col) { // Clicked left of empty, shift right
                for (let i = tilesToMove.length - 1; i > 0; i--) {
                    const current = tilesToMove[i];
                    const prev = tilesToMove[i - 1];
                    newBoard[current.row][current.col] = prev.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // Clicked tile becomes empty
            } else { // Clicked right of empty, shift left
                for (let i = 0; i < tilesToMove.length - 1; i++) {
                    const current = tilesToMove[i];
                    const next = tilesToMove[i + 1];
                    newBoard[current.row][current.col] = next.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // Clicked tile becomes empty
            }
        } else { // isSameCol
            if (clickedRow < emptyTilePos.row) { // Clicked above empty, shift down
                for (let i = tilesToMove.length - 1; i > 0; i--) {
                    const current = tilesToMove[i];
                    const prev = tilesToMove[i - 1];
                    newBoard[current.row][current.col] = prev.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // Clicked tile becomes empty
            } else { // Clicked below empty, shift up
                for (let i = 0; i < tilesToMove.length - 1; i++) {
                    const current = tilesToMove[i];
                    const next = tilesToMove[i + 1];
                    newBoard[current.row][current.col] = next.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // Clicked tile becomes empty
            }
        }

        // Update the board and empty tile position
        board = newBoard;
        emptyTilePos = { row: clickedRow, col: clickedCol };

        updateMoveCount(1);
        updateTilePositions(); // Update DOM positions for animation
        checkWinCondition();
    }

    function updateTilePositions() {
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const tileValue = board[r][c];
                const tileElement = document.querySelector(`.tile[data-value="${tileValue}"]`);
                if (tileElement) {
                    // Update data attributes for future clicks
                    tileElement.dataset.row = r;
                    tileElement.dataset.col = c;

                    // Use CSS Grid properties for positioning and animation
                    tileElement.style.gridRowStart = r + 1;
                    tileElement.style.gridColumnStart = c + 1;

                    // Ensure empty tile has correct class
                    if (tileValue === 0) {
                        tileElement.classList.add('empty');
                    } else {
                        tileElement.classList.remove('empty');
                    }
                }
            }
        }
    }

    // --- Counters and Win Condition ---

    function updateMoveCount(increment = 0) {
        moveCount += increment;
        moveCountDisplay.textContent = moveCount;
    }

    function startGameTimer() {
        if (timerInterval) clearInterval(timerInterval);
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            gameTimeDisplay.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetTimer() {
        stopTimer();
        gameTimeDisplay.textContent = '00:00';
    }

    function checkWinCondition() {
        let correct = true;
        let expectedValue = 1;
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (expectedValue === N * N) { // Last tile should be empty
                    if (board[r][c] !== 0) {
                        correct = false;
                        break;
                    }
                } else {
                    if (board[r][c] !== expectedValue) {
                        correct = false;
                        break;
                    }
                }
                expectedValue++;
            }
            if (!correct) break;
        }

        if (correct) {
            stopTimer();
            gameStarted = false;
            winMessage.classList.remove('hidden');
        }
    }

    // --- Event Listeners ---

    generateGameBtn.addEventListener('click', () => {
        const newSize = parseInt(boardSizeInput.value);
        if (isNaN(newSize) || newSize < 2) {
            alert('請輸入一個大於等於 2 的數字作為盤面尺寸！');
            return;
        }
        initializeGame(newSize);
    });

    resetGameBtn.addEventListener('click', () => {
        // Re-shuffle current board size
        initializeGame(N);
    });

    closeWinMessageBtn.addEventListener('click', () => {
        winMessage.classList.add('hidden');
    });

    // Initial game setup
    initializeGame(N);
});