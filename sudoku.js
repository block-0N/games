class Sudoku {
    constructor() {
        this.difficulties = {
            easy: { holes: 30 },
            medium: { holes: 40 },
            hard: { holes: 50 }
        };

        this.currentDifficulty = 'easy';
        this.board = [];
        this.solution = [];
        this.initialBoard = [];
        this.selectedCell = null;
        this.timer = 0;
        this.hintCount = 0;
        this.timerInterval = null;

        this.gameBoard = document.getElementById('game-board');
        this.difficultyDisplay = document.getElementById('difficulty-display');
        this.timerElement = document.getElementById('timer');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.gameMessage = document.getElementById('game-message');
        this.retryBtn = document.querySelector('.retry-btn');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
        this.numBtns = document.querySelectorAll('.num-btn');
        this.hintBtn = document.getElementById('hint-btn');
        this.checkBtn = document.getElementById('check-btn');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame();
    }

    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.retryBtn.addEventListener('click', () => this.startNewGame());

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentDifficulty = e.target.dataset.difficulty;
                this.difficultyBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.startNewGame();
            });
        });

        this.numBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const num = parseInt(e.target.dataset.num);
                this.fillNumber(num);
            });
        });

        this.hintBtn.addEventListener('click', () => this.giveHint());
        this.checkBtn.addEventListener('click', () => this.checkBoard());

        // 添加键盘事件监听器
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    startNewGame() {
        this.stopTimer();
        this.timer = 0;
        this.hintCount = 0;
        this.timerElement.textContent = '00:00';

        this.solution = this.generateSolution();
        this.board = this.generatePuzzle(this.solution);
        this.initialBoard = this.board.map(row => [...row]);
        this.selectedCell = null;

        const difficultyText = {
            easy: '简单',
            medium: '中等',
            hard: '困难'
        };
        this.difficultyDisplay.textContent = difficultyText[this.currentDifficulty];

        this.hideGameMessage();
        this.renderBoard();
        this.startTimer();
    }

    generateSolution() {
        const board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solveSudoku(board);
        return board;
    }

    solveSudoku(board) {
        const emptyCell = this.findEmptyCell(board);
        if (!emptyCell) return true;

        const [row, col] = emptyCell;
        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const num of numbers) {
            if (this.isValidPlacement(board, row, col, num)) {
                board[row][col] = num;
                if (this.solveSudoku(board)) {
                    return true;
                }
                board[row][col] = 0;
            }
        }

        return false;
    }

    findEmptyCell(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    isValidPlacement(board, row, col, num) {
        // 检查行
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num) return false;
        }

        // 检查列
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) return false;
        }

        // 检查3x3宫格
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        return true;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    generatePuzzle(solution) {
        const puzzle = solution.map(row => [...row]);
        const holes = this.difficulties[this.currentDifficulty].holes;
        let removed = 0;

        while (removed < holes) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);

            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                removed++;
            }
        }

        return puzzle;
    }

    renderBoard() {
        this.gameBoard.innerHTML = '';

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.initialBoard[row][col] !== 0) {
                    cell.classList.add('fixed');
                    cell.textContent = this.initialBoard[row][col];
                } else if (this.board[row][col] !== 0) {
                    cell.textContent = this.board[row][col];
                }

                cell.addEventListener('click', () => this.selectCell(row, col));
                this.gameBoard.appendChild(cell);
            }
        }
    }

    selectCell(row, col) {
        if (this.initialBoard[row][col] !== 0) return;

        // 清除之前的选择
        this.gameBoard.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected', 'highlighted');
        });

        // 选择新单元格
        const cell = this.getCell(row, col);
        cell.classList.add('selected');
        this.selectedCell = { row, col };

        // 高亮相同数字的单元格
        const num = this.board[row][col];
        if (num !== 0) {
            this.highlightSameNumbers(num);
        }

        // 高亮相关行、列和宫格
        this.highlightRelated(row, col);
    }

    highlightSameNumbers(num) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === num) {
                    const cell = this.getCell(row, col);
                    cell.classList.add('highlighted');
                }
            }
        }
    }

    highlightRelated(row, col) {
        // 高亮行
        for (let c = 0; c < 9; c++) {
            const cell = this.getCell(row, c);
            cell.classList.add('highlighted');
        }

        // 高亮列
        for (let r = 0; r < 9; r++) {
            const cell = this.getCell(r, col);
            cell.classList.add('highlighted');
        }

        // 高亮3x3宫格
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cell = this.getCell(boxRow + i, boxCol + j);
                cell.classList.add('highlighted');
            }
        }
    }

    fillNumber(num) {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;
        if (this.initialBoard[row][col] !== 0) return;

        if (num === 0) {
            this.board[row][col] = 0;
        } else {
            this.board[row][col] = num;
        }

        const cell = this.getCell(row, col);
        cell.textContent = num === 0 ? '' : num;
        cell.classList.remove('error', 'correct');

        // 检查是否正确
        if (num !== 0 && num === this.solution[row][col]) {
            cell.classList.add('correct');
        } else if (num !== 0) {
            cell.classList.add('error');
        }

        // 检查是否完成
        this.checkCompletion();
    }

    handleKeyPress(e) {
        const key = e.key;

        // 数字键 1-9
        if (key >= '1' && key <= '9') {
            e.preventDefault();
            this.fillNumber(parseInt(key));
        }
        // 删除键或0键
        else if (key === 'Backspace' || key === 'Delete' || key === '0') {
            e.preventDefault();
            this.fillNumber(0);
        }
        // 方向键移动选择
        else if (this.selectedCell) {
            let { row, col } = this.selectedCell;
            if (key === 'ArrowUp' && row > 0) {
                e.preventDefault();
                this.selectCell(row - 1, col);
            } else if (key === 'ArrowDown' && row < 8) {
                e.preventDefault();
                this.selectCell(row + 1, col);
            } else if (key === 'ArrowLeft' && col > 0) {
                e.preventDefault();
                this.selectCell(row, col - 1);
            } else if (key === 'ArrowRight' && col < 8) {
                e.preventDefault();
                this.selectCell(row, col + 1);
            }
        }
    }

    giveHint() {
        // 找一个空格
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) return;

        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.board[row][col] = this.solution[row][col];
        this.hintCount++;

        const cell = this.getCell(row, col);
        cell.textContent = this.solution[row][col];
        cell.classList.add('correct');

        this.checkCompletion();
    }

    checkBoard() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = this.getCell(row, col);

                if (this.board[row][col] !== 0) {
                    if (this.board[row][col] === this.solution[row][col]) {
                        cell.classList.add('correct');
                        cell.classList.remove('error');
                    } else {
                        cell.classList.add('error');
                        cell.classList.remove('correct');
                    }
                }
            }
        }
    }

    checkCompletion() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] !== this.solution[row][col]) {
                    return false;
                }
            }
        }

        this.gameWon();
        return true;
    }

    gameWon() {
        this.stopTimer();
        this.showGameMessage(true);
    }

    getCell(row, col) {
        return this.gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            const minutes = Math.floor(this.timer / 60).toString().padStart(2, '0');
            const seconds = (this.timer % 60).toString().padStart(2, '0');
            this.timerElement.textContent = `${minutes}:${seconds}`;
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
            const minutes = Math.floor(this.timer / 60).toString().padStart(2, '0');
            const seconds = (this.timer % 60).toString().padStart(2, '0');
            const message = `🎉 恭喜获胜！\n\n总用时：${minutes}:${seconds}\n提示次数：${this.hintCount}`;
            this.gameMessage.querySelector('p').innerHTML = message.replace(/\n/g, '<br>');
        } else {
            this.gameMessage.classList.add('game-lost');
            this.gameMessage.querySelector('p').textContent = '游戏结束';
        }
    }

    hideGameMessage() {
        this.gameMessage.style.display = 'none';
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new Sudoku();
});