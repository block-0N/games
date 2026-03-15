class Minesweeper {
    constructor() {
        this.difficulties = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 }
        };

        this.currentDifficulty = 'easy';
        this.board = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.firstClick = true;
        this.timer = 0;
        this.timerInterval = null;

        this.gameBoard = document.getElementById('game-board');
        this.minesCountElement = document.getElementById('mines-count');
        this.timerElement = document.getElementById('timer');
        this.resetBtn = document.getElementById('reset-btn');
        this.gameMessage = document.getElementById('game-message');
        this.retryBtn = document.querySelector('.retry-btn');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame();
    }

    setupEventListeners() {
        this.resetBtn.addEventListener('click', () => this.startNewGame());
        this.retryBtn.addEventListener('click', () => this.startNewGame());

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentDifficulty = e.target.dataset.difficulty;
                this.difficultyBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.startNewGame();
            });
        });
    }

    startNewGame() {
        this.stopTimer();
        this.timer = 0;
        this.timerElement.textContent = '000';

        const config = this.difficulties[this.currentDifficulty];
        this.rows = config.rows;
        this.cols = config.cols;
        this.totalMines = config.mines;

        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.gameOver = false;
        this.firstClick = true;

        this.updateMinesCount();
        this.hideGameMessage();
        this.renderBoard();
    }

    placeMines(excludeRow, excludeCol) {
        let minesPlaced = 0;
        while (minesPlaced < this.totalMines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            if (!this.board[row][col] && !(row === excludeRow && col === excludeCol)) {
                this.board[row][col] = -1;
                minesPlaced++;
            }
        }

        this.calculateNumbers();
    }

    calculateNumbers() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1) continue;

                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const newRow = row + i;
                        const newCol = col + j;
                        if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
                            if (this.board[newRow][newCol] === -1) {
                                count++;
                            }
                        }
                    }
                }
                this.board[row][col] = count;
            }
        }
    }

    renderBoard() {
        this.gameBoard.innerHTML = '';

        // 根据难度设置格子大小
        let cellSize;
        if (this.currentDifficulty === 'hard') {
            cellSize = 25;
        } else if (this.currentDifficulty === 'medium') {
            cellSize = 28;
        } else {
            cellSize = 30;
        }

        this.gameBoard.style.gridTemplateColumns = `repeat(${this.cols}, ${cellSize}px)`;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize * 0.5}px`;

                cell.addEventListener('click', () => this.handleClick(row, col));
                cell.addEventListener('contextmenu', (e) => this.handleRightClick(e, row, col));

                this.gameBoard.appendChild(cell);
            }
        }
    }

    handleClick(row, col) {
        if (this.gameOver || this.flagged[row][col] || this.revealed[row][col]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
        }

        if (this.board[row][col] === -1) {
            this.explode(row, col);
        } else {
            this.revealCell(row, col);
            this.checkWin();
        }
    }

    handleRightClick(e, row, col) {
        e.preventDefault();
        if (this.gameOver || this.revealed[row][col]) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
        }

        this.flagged[row][col] = !this.flagged[row][col];
        this.updateCell(row, col);
        this.updateMinesCount();
    }

    revealCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        if (this.revealed[row][col] || this.flagged[row][col]) return;

        this.revealed[row][col] = true;
        this.updateCell(row, col);

        if (this.board[row][col] === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    this.revealCell(row + i, col + j);
                }
            }
        }
    }

    explode(row, col) {
        this.gameOver = true;
        this.stopTimer();
        this.revealed[row][col] = true;
        this.updateCell(row, col);

        // 揭示所有地雷
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === -1) {
                    this.revealed[r][c] = true;
                    this.updateCell(r, c);
                } else if (this.flagged[r][c]) {
                    const cell = this.getCell(r, c);
                    cell.classList.add('mine-wrong');
                }
            }
        }

        this.showGameMessage(false);
    }

    checkWin() {
        let revealedCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.revealed[row][col]) {
                    revealedCount++;
                }
            }
        }

        const totalCells = this.rows * this.cols;
        if (revealedCount === totalCells - this.totalMines) {
            this.gameOver = true;
            this.stopTimer();

            // 标记所有地雷
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    if (this.board[row][col] === -1) {
                        this.flagged[row][col] = true;
                        this.updateCell(row, col);
                    }
                }
            }

            this.showGameMessage(true);
        }
    }

    updateCell(row, col) {
        const cell = this.getCell(row, col);

        if (this.revealed[row][col]) {
            cell.classList.add('revealed');

            if (this.board[row][col] === -1) {
                cell.classList.add('mine');
                if (row === this.explodeRow && col === this.explodeCol) {
                    cell.classList.add('exploded');
                }
            } else if (this.board[row][col] > 0) {
                cell.textContent = this.board[row][col];
                cell.dataset.num = this.board[row][col];
            }
        }

        if (this.flagged[row][col]) {
            cell.classList.add('flagged');
        } else {
            cell.classList.remove('flagged');
        }
    }

    getCell(row, col) {
        return this.gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    updateMinesCount() {
        let flagCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.flagged[row][col]) {
                    flagCount++;
                }
            }
        }
        this.minesCountElement.textContent = this.totalMines - flagCount;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.timerElement.textContent = String(this.timer).padStart(3, '0');
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showGameMessage(won) {
        this.gameMessage.style.display = 'flex';
        this.gameMessage.className = 'game-message';
        if (won) {
            this.gameMessage.classList.add('game-won');
            this.gameMessage.querySelector('p').textContent = '🎉 恭喜获胜！';
        } else {
            this.gameMessage.classList.add('game-over');
            this.gameMessage.querySelector('p').textContent = '💥 游戏结束！';
        }
    }

    hideGameMessage() {
        this.gameMessage.style.display = 'none';
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});