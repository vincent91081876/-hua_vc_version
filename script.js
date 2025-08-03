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
    let emptyTilePos = { row: 0, col: 0 }; // Will be updated by generateSolvableBoard
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

        generateSolvableBoard(); // 使用新的生成邏輯
        renderBoard();
    }

    /**
     * 生成一個可解的盤面。
     * 方法是從一個已解的盤面開始，然後執行一系列隨機但合法的移動來打亂它。
     */
    function generateSolvableBoard() {
        const totalTiles = N * N;
        // 1. 從一個已解的盤面開始 (1, 2, ..., N*N-1, 0)
        board = [];
        let k = 1;
        for (let i = 0; i < N; i++) {
            board[i] = [];
            for (let j = 0; j < N; j++) {
                board[i][j] = k % totalTiles; // 1 到 N*N-1，最後一個是 0 (空格)
                k++;
            }
        }
        emptyTilePos = { row: N - 1, col: N - 1 }; // 空格初始在右下角

        // 2. 執行隨機合法移動來打亂盤面
        // 移動次數與 N 的立方成正比，以確保足夠的隨機性，同時避免過度耗時
        const numShuffles = N * N * N * 2; // 增加因子以確保更徹底的打亂
        let prevEmptyPosForReversalCheck = { ...emptyTilePos }; // 記錄上一步空格的位置，用於避免立即反轉

        for (let i = 0; i < numShuffles; i++) {
            const possibleMoves = getValidMovesForShuffling(board, emptyTilePos, prevEmptyPosForReversalCheck);

            if (possibleMoves.length === 0) {
                // 理論上對於 N >= 2 的盤面不應該發生，除非邏輯有誤
                console.warn("打亂過程中沒有可行的移動，提前結束。");
                break;
            }

            const randomMoveIndex = Math.floor(Math.random() * possibleMoves.length);
            const { row: clickedRow, col: clickedCol } = possibleMoves[randomMoveIndex];

            // 在執行移動前，記錄當前空格的位置，作為下一次循環的 `prevEmptyPosForReversalCheck`
            prevEmptyPosForReversalCheck = { ...emptyTilePos };

            // 應用移動到盤面狀態 (不涉及 DOM 操作)
            const { newBoard, newEmptyPos } = applyMoveToBoardState(board, emptyTilePos, clickedRow, clickedCol);
            board = newBoard;
            emptyTilePos = newEmptyPos;
        }
    }

    /**
     * 獲取當前盤面所有合法的移動選項，並避免立即反轉上一步操作。
     * @param {Array<Array<number>>} currentBoard 當前盤面狀態
     * @param {{row: number, col: number}} currentEmptyPos 當前空格位置
     * @param {{row: number, col: number}} emptyPosBeforeLastMove 上一步移動前空格的位置 (用於避免反轉)
     * @returns {Array<{row: number, col: number}>} 可點擊的方塊座標列表
     */
    function getValidMovesForShuffling(currentBoard, currentEmptyPos, emptyPosBeforeLastMove) {
        const moves = [];
        const emptyRow = currentEmptyPos.row;
        const emptyCol = currentEmptyPos.col;

        // 檢查同行可移動的方塊
        for (let c = 0; c < N; c++) {
            if (c !== emptyCol) { // 排除空格本身
                const clickedTileRow = emptyRow;
                const clickedTileCol = c;

                // 判斷此移動是否會將空格移回上一步的位置 (即反轉)
                // 空格總是移動到被點擊方塊的原始位置
                if (!(clickedTileRow === emptyPosBeforeLastMove.row && clickedTileCol === emptyPosBeforeLastMove.col)) {
                    moves.push({ row: clickedTileRow, col: clickedTileCol });
                }
            }
        }

        // 檢查同列可移動的方塊
        for (let r = 0; r < N; r++) {
            if (r !== emptyRow) { // 排除空格本身
                const clickedTileRow = r;
                const clickedTileCol = emptyCol;

                // 判斷此移動是否會將空格移回上一步的位置 (即反轉)
                if (!(clickedTileRow === emptyPosBeforeLastMove.row && clickedTileCol === emptyPosBeforeLastMove.col)) {
                    moves.push({ row: clickedTileRow, col: clickedTileCol });
                }
            }
        }
        return moves;
    }

    /**
     * 應用一次移動到盤面狀態，並返回新的盤面和空格位置。
     * 此函數不修改傳入的 `currentBoard`，而是返回一個新的盤面副本。
     * @param {Array<Array<number>>} currentBoard 當前盤面狀態
     * @param {{row: number, col: number}} currentEmptyPos 當前空格位置
     * @param {number} clickedRow 被點擊方塊的行
     * @param {number} clickedCol 被點擊方塊的列
     * @returns {{newBoard: Array<Array<number>>, newEmptyPos: {row: number, col: number}}} 新的盤面狀態和空格位置
     */
    function applyMoveToBoardState(currentBoard, currentEmptyPos, clickedRow, clickedCol) {
        const newBoard = currentBoard.map(row => [...row]); // 創建盤面的深層副本
        const newEmptyPos = { row: clickedRow, col: clickedCol }; // 被點擊方塊的原始位置將成為新的空格

        const isSameRow = clickedRow === currentEmptyPos.row;
        // const isSameCol = clickedCol === currentEmptyPos.col; // 如果不同行，則必然同列

        let tilesToMove = [];
        if (isSameRow) {
            // 水平移動
            const startCol = Math.min(clickedCol, currentEmptyPos.col);
            const endCol = Math.max(clickedCol, currentEmptyPos.col);
            for (let c = startCol; c <= endCol; c++) {
                tilesToMove.push({ row: clickedRow, col: c, value: newBoard[clickedRow][c] });
            }
        } else { // isSameCol
            // 垂直移動
            const startRow = Math.min(clickedRow, currentEmptyPos.row);
            const endRow = Math.max(clickedRow, currentEmptyPos.row);
            for (let r = startRow; r <= endRow; r++) {
                tilesToMove.push({ row: r, col: clickedCol, value: newBoard[r][clickedCol] });
            }
        }

        const originalEmptyValue = newBoard[currentEmptyPos.row][currentEmptyPos.col]; // 應該是 0

        if (isSameRow) {
            if (clickedCol < currentEmptyPos.col) { // 點擊方塊在空格左側，向右移動
                for (let i = tilesToMove.length - 1; i > 0; i--) {
                    const current = tilesToMove[i];
                    const prev = tilesToMove[i - 1];
                    newBoard[current.row][current.col] = prev.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // 被點擊方塊的位置變為空格
            } else { // 點擊方塊在空格右側，向左移動
                for (let i = 0; i < tilesToMove.length - 1; i++) {
                    const current = tilesToMove[i];
                    const next = tilesToMove[i + 1];
                    newBoard[current.row][current.col] = next.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // 被點擊方塊的位置變為空格
            }
        } else { // isSameCol
            if (clickedRow < currentEmptyPos.row) { // 點擊方塊在空格上方，向下移動
                for (let i = tilesToMove.length - 1; i > 0; i--) {
                    const current = tilesToMove[i];
                    const prev = tilesToMove[i - 1];
                    newBoard[current.row][current.col] = prev.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // 被點擊方塊的位置變為空格
            } else { // 點擊方塊在空格下方，向上移動
                for (let i = 0; i < tilesToMove.length - 1; i++) {
                    const current = tilesToMove[i];
                    const next = tilesToMove[i + 1];
                    newBoard[current.row][current.col] = next.value;
                }
                newBoard[clickedRow][clickedCol] = originalEmptyValue; // 被點擊方塊的位置變為空格
            }
        }

        return { newBoard, newEmptyPos };
    }

    function renderBoard() {
        gameBoard.innerHTML = ''; // 清除現有方塊
        gameBoard.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${N}, 1fr)`;

        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const tileValue = board[r][c];
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.dataset.row = r;
                tile.dataset.col = c;
                tile.dataset.value = tileValue; // 使用 data-value 屬性來唯一識別方塊

                if (tileValue === 0) {
                    tile.classList.add('empty');
                    tile.textContent = '';
                } else {
                    tile.textContent = tileValue;
                }
                gameBoard.appendChild(tile);
            }
        }
        // 重新為新生成的方塊附加事件監聽器
        attachTileEventListeners();
    }

    function attachTileEventListeners() {
        document.querySelectorAll('.tile:not(.empty)').forEach(tile => {
            tile.removeEventListener('click', handleTileClick); // 防止重複綁定
            tile.addEventListener('click', handleTileClick);
        });
    }

    // --- 遊戲邏輯 (移動) ---

    function handleTileClick(event) {
        if (winMessage.classList.contains('hidden') === false) return; // 勝利訊息顯示時不允許移動

        const clickedTile = event.target;
        const clickedRow = parseInt(clickedTile.dataset.row);
        const clickedCol = parseInt(clickedTile.dataset.col);

        // 檢查點擊的方塊是否與空格在同一行或同一列
        const isSameRow = clickedRow === emptyTilePos.row;
        const isSameCol = clickedCol === emptyTilePos.col;

        if (!isSameRow && !isSameCol) {
            return; // 非法移動
        }

        if (!gameStarted) {
            startGameTimer();
            gameStarted = true;
        }

        // 使用 applyMoveToBoardState 函數來更新全局的 board 和 emptyTilePos
        const { newBoard, newEmptyPos } = applyMoveToBoardState(board, emptyTilePos, clickedRow, clickedCol);
        board = newBoard;
        emptyTilePos = newEmptyPos;

        updateMoveCount(1);
        updateTilePositions(); // 更新 DOM 元素位置以觸發動畫
        checkWinCondition();
    }

    function updateTilePositions() {
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                const tileValue = board[r][c];
                // 透過 data-value 找到對應的 DOM 元素，因為其在 DOM 中的位置可能尚未更新
                const tileElement = document.querySelector(`.tile[data-value="${tileValue}"]`);
                if (tileElement) {
                    // 更新 data 屬性，以便下次點擊時能獲取正確的邏輯位置
                    tileElement.dataset.row = r;
                    tileElement.dataset.col = c;

                    // 使用 CSS Grid 屬性來定位和觸發動畫
                    tileElement.style.gridRowStart = r + 1;
                    tileElement.style.gridColumnStart = c + 1;

                    // 確保空格方塊有正確的 class
                    if (tileValue === 0) {
                        tileElement.classList.add('empty');
                    } else {
                        tileElement.classList.remove('empty');
                    }
                }
            }
        }
    }

    // --- 計數器與勝利條件 ---

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
                if (expectedValue === N * N) { // 最後一個方塊應該是空格 (值為 0)
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

    // --- 事件監聽器 ---

    generateGameBtn.addEventListener('click', () => {
        const newSize = parseInt(boardSizeInput.value);
        if (isNaN(newSize) || newSize < 2) {
            alert('請輸入一個大於等於 2 的數字作為盤面尺寸！');
            return;
        }
        initializeGame(newSize);
    });

    resetGameBtn.addEventListener('click', () => {
        // 重新打亂當前尺寸的盤面
        initializeGame(N);
    });

    closeWinMessageBtn.addEventListener('click', () => {
        winMessage.classList.add('hidden');
    });

    // 初始遊戲設定
    initializeGame(N);
});