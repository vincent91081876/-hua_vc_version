document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素獲取 ---
    const difficultyInput = document.getElementById('difficulty');
    const resetButton = document.getElementById('reset-button');
    const boardElement = document.getElementById('board');
    const movesElement = document.getElementById('moves');
    const timerElement = document.getElementById('timer');
    const winMessageElement = document.getElementById('win-message');
    const winStatsElement = document.getElementById('win-stats');

    // --- 遊戲狀態變數 ---
    let size = 4;
    let board = [];
    let emptyTile = { row: 0, col: 0 };
    let moves = 0;
    let timerInterval;
    let seconds = 0;
    let gameActive = false;

    // --- 事件監聽 ---
    resetButton.addEventListener('click', initGame);

    // --- 遊戲主函式 ---
    function initGame() {
        // 停止舊的計時器
        stopTimer();
        
        // 獲取並驗證難度
        let inputSize = parseInt(difficultyInput.value);
        size = Math.max(2, Math.min(10, inputSize)); // 限制在 2-10 之間以防瀏覽器崩潰
        difficultyInput.value = size;
        
        // 重置狀態
        moves = 0;
        seconds = 0;
        gameActive = true;
        updateMoves();
        updateTimerDisplay();
        
        // 隱藏勝利訊息
        winMessageElement.classList.add('hidden');
        
        // 建立並打亂謎題
        createSolvableBoard();
        
        // 渲染遊戲介面
        renderBoard();
        
        // 開始新的計時器
        startTimer();
    }
    
    // --- 謎題生成 (保證有解) ---
    function createSolvableBoard() {
        // 1. 先建立一個已完成的盤面
        board = Array(size * size).fill(0).map((_, index) => index + 1);
        board[board.length - 1] = 0; // 0 代表空格

        // 2. 找到空格的位置
        emptyTile = { row: size - 1, col: size - 1 };

        // 3. 從完成狀態開始，進行大量隨機的有效移動來打亂
        // 這樣可以 100% 保證謎題是有解的
        let shuffleMoves = size * size * 10; // 打亂次數
        for (let i = 0; i < shuffleMoves; i++) {
            const neighbors = getValidNeighbors(emptyTile.row, emptyTile.col);
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            swapTiles(emptyTile.row, emptyTile.col, randomNeighbor.row, randomNeighbor.col);
            emptyTile = randomNeighbor;
        }

        // 將一維陣列轉換為二維
        const oneDimBoard = [...board];
        board = [];
        for (let i = 0; i < size; i++) {
            board.push(oneDimBoard.slice(i * size, (i + 1) * size));
        }

        // 找到打亂後空格的最終位置
        for(let r=0; r < size; r++) {
            for(let c=0; c < size; c++) {
                if (board[r][c] === 0) {
                    emptyTile = { row: r, col: c };
                    return;
                }
            }
        }
    }
    
    function getValidNeighbors(row, col) {
        const neighbors = [];
        if (row > 0) neighbors.push({ row: row - 1, col }); // 上
        if (row < size - 1) neighbors.push({ row: row + 1, col }); // 下
        if (col > 0) neighbors.push({ row, col: col - 1 }); // 左
        if (col < size - 1) neighbors.push({ row, col: col + 1 }); // 右
        return neighbors;
    }


    // --- 遊戲介面渲染 ---
    function renderBoard() {
        boardElement.innerHTML = '';
        
        // 動態設定 CSS 變數以實現縮放
        const boardSize = Math.min(boardElement.parentElement.clientWidth, boardElement.parentElement.clientHeight);
        const tileSize = (boardSize - 5 * (size - 1) - 20) / size;
        const fontSize = tileSize * 0.4;
        
        boardElement.style.setProperty('--grid-size', size);
        boardElement.style.width = `${boardSize}px`;
        boardElement.style.height = `${boardSize}px`;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const tileValue = board[r][c];
                const tile = document.createElement('div');
                tile.classList.add('tile');
                
                tile.style.setProperty('--tile-size', `${tileSize}px`);
                tile.style.setProperty('--font-size', `${fontSize}px`);

                // 使用絕對定位實現平滑移動
                tile.style.top = `${r * (tileSize + 5) + 10}px`;
                tile.style.left = `${c * (tileSize + 5) + 10}px`;
                
                if (tileValue === 0) {
                    tile.classList.add('empty');
                } else {
                    tile.textContent = tileValue;
                    tile.addEventListener('click', () => handleTileClick(r, c));
                }
                boardElement.appendChild(tile);
            }
        }
    }

    // --- 玩家互動 ---
    function handleTileClick(row, col) {
        if (!gameActive) return;

        // 檢查點擊的方塊是否與空格相鄰
        const dx = Math.abs(row - emptyTile.row);
        const dy = Math.abs(col - emptyTile.col);

        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // 交換方塊
            swapTiles(row, col, emptyTile.row, emptyTile.col);
            emptyTile = { row, col };

            // 更新狀態
            moves++;
            updateMoves();
            
            // 重新渲染並檢查勝利
            renderBoard();
            checkWin();
        }
    }
    
    function swapTiles(r1, c1, r2, c2) {
        if(Array.isArray(board[0])) { // 如果是二維陣列
            const temp = board[r1][c1];
            board[r1][c1] = board[r2][c2];
            board[r2][c2] = temp;
        } else { // 如果是一維陣列 (僅在初始化時使用)
            const temp = board[r1 * size + c1];
            board[r1 * size + c1] = board[r2 * size + c2];
            board[r2 * size + c2] = temp;
        }
    }


    // --- 計時器與計步器 ---
    function startTimer() {
        timerInterval = setInterval(() => {
            seconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function updateMoves() {
        movesElement.textContent = `移動步數: ${moves}`;
    }

    function updateTimerDisplay() {
        timerElement.textContent = `遊戲時間: ${seconds}s`;
    }

    // --- 勝利判斷 ---
    function checkWin() {
        let current = 1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (r === size - 1 && c === size - 1) {
                    if (board[r][c] === 0) {
                        // 遊戲勝利
                        gameActive = false;
                        stopTimer();
                        winStatsElement.textContent = `您用了 ${seconds} 秒 和 ${moves} 步完成！`;
                        winMessageElement.classList.remove('hidden');
                        return;
                    }
                } else if (board[r][c] !== current) {
                    return; // 盤面尚未排好
                }
                current++;
            }
        }
    }
    
    // --- 處理視窗縮放，保持介面比例正確 ---
    window.addEventListener('resize', renderBoard);
    
    // --- 首次載入遊戲 ---
    initGame();
});