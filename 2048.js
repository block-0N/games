class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gameOver = false;
        this.gameWon = false;
        this.tileContainer = document.getElementById('tile-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameMessage = document.getElementById('game-message');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.retryBtn = document.querySelector('.retry-btn');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame();

        // 添加窗口大小改变时的监听器
        window.addEventListener('resize', () => {
            this.render();
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.retryBtn.addEventListener('click', () => this.startNewGame());

        // 添加触摸支持
        let touchStartX, touchStartY;
        const gameContainer = document.querySelector('.game-container');

        gameContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        gameContainer.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            const minSwipe = 50;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > minSwipe) {
                    if (diffX > 0) {
                        this.move('right');
                    } else {
                        this.move('left');
                    }
                }
            } else {
                if (Math.abs(diffY) > minSwipe) {
                    if (diffY > 0) {
                        this.move('down');
                    } else {
                        this.move('up');
                    }
                }
            }

            touchStartX = null;
            touchStartY = null;
        });
    }

    startNewGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.updateScore();
        this.hideGameMessage();
        this.tileContainer.innerHTML = '';

        // 添加两个初始方块
        this.addRandomTile();
        this.addRandomTile();
        this.render();
    }

    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[row][col] = Math.random() < 0.9 ? 2 : 4;
            return { row, col };
        }
        return null;
    }

    handleKeyDown(e) {
        if (this.gameOver) return;

        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        if (keyMap[e.key]) {
            e.preventDefault();
            this.move(keyMap[e.key]);
        }
    }

    move(direction) {
        if (this.gameOver) return;

        let moved = false;
        const mergedPositions = [];

        // 根据方向处理
        if (direction === 'left' || direction === 'right') {
            for (let row = 0; row < this.size; row++) {
                const result = this.processLine(this.grid[row], direction);
                if (result.moved) moved = true;
                this.grid[row] = result.line;
                result.mergedIndices.forEach(col => mergedPositions.push({ row, col }));
            }
        } else if (direction === 'up' || direction === 'down') {
            for (let col = 0; col < this.size; col++) {
                const line = [];
                for (let row = 0; row < this.size; row++) {
                    line.push(this.grid[row][col]);
                }
                const result = this.processLine(line, direction);
                if (result.moved) moved = true;
                for (let row = 0; row < this.size; row++) {
                    this.grid[row][col] = result.line[row];
                }
                result.mergedIndices.forEach(rowIndex => mergedPositions.push({ row: rowIndex, col }));
            }
        }

        if (moved) {
            const newTile = this.addRandomTile();
            this.updateScore();
            this.render(newTile, mergedPositions);

            // 检查游戏状态
            if (this.checkWin()) {
                this.gameWon = true;
                this.showGameMessage(true);
            } else if (this.checkGameOver()) {
                this.gameOver = true;
                this.showGameMessage(false);
            }
        }
    }

    processLine(line, direction) {
        let moved = false;
        const mergedIndices = [];

        // 移除零并压缩
        let filtered = line.filter(val => val !== 0);

        if (direction === 'right' || direction === 'down') {
            filtered = filtered.reverse();
        }

        // 合并相同数字
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                this.score += filtered[i];
                filtered.splice(i + 1, 1);
                mergedIndices.push(i);
            }
        }

        // 填充零
        while (filtered.length < this.size) {
            filtered.push(0);
        }

        if (direction === 'right' || direction === 'down') {
            filtered = filtered.reverse();
            // 调整合并索引
            for (let i = 0; i < mergedIndices.length; i++) {
                mergedIndices[i] = this.size - 1 - mergedIndices[i];
            }
        }

        // 检查是否移动
        for (let i = 0; i < this.size; i++) {
            if (line[i] !== filtered[i]) {
                moved = true;
                break;
            }
        }

        return { line: filtered, moved, mergedIndices };
    }

    checkWin() {
        if (this.gameWon) return false;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    checkGameOver() {
        // 检查是否有空位
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    return false;
                }
            }
        }

        // 检查是否可以合并
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const current = this.grid[row][col];
                // 检查右边
                if (col < this.size - 1 && this.grid[row][col + 1] === current) {
                    return false;
                }
                // 检查下边
                if (row < this.size - 1 && this.grid[row + 1][col] === current) {
                    return false;
                }
            }
        }

        return true;
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
        }
        this.bestScoreElement.textContent = this.bestScore;
    }

    showGameMessage(won) {
        this.gameMessage.style.display = 'flex';
        this.gameMessage.className = 'game-message';
        if (won) {
            this.gameMessage.classList.add('game-won');
            this.gameMessage.querySelector('p').textContent = '你赢了！';
        } else {
            this.gameMessage.classList.add('game-over');
            this.gameMessage.querySelector('p').textContent = '游戏结束';
        }
    }

    hideGameMessage() {
        this.gameMessage.style.display = 'none';
    }

    render(newTilePos = null, mergedPositions = []) {
        this.tileContainer.innerHTML = '';

        // 获取窗口尺寸以确定使用哪种尺寸配置
        const windowWidth = window.innerWidth;
        let cellSize, gap;

        if (windowWidth <= 400) {
            cellSize = 55;
            gap = 10;
        } else if (windowWidth <= 520) {
            cellSize = 65;
            gap = 12;
        } else {
            cellSize = 80;
            gap = 15;
        }

        // 设置tile-container的宽高
        const containerWidth = 4 * cellSize + 3 * gap;
        const containerHeight = 4 * cellSize + 3 * gap;
        this.tileContainer.style.width = `${containerWidth}px`;
        this.tileContainer.style.height = `${containerHeight}px`;

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.grid[row][col];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${value > 2048 ? 'super' : value}`;

                    // 检查是否是新添加的方块
                    if (newTilePos && newTilePos.row === row && newTilePos.col === col) {
                        tile.classList.add('tile-new');
                    }

                    // 检查是否是合并的方块
                    if (mergedPositions.some(pos => pos.row === row && pos.col === col)) {
                        tile.classList.add('tile-merged');
                    }

                    tile.textContent = value;

                    // 计算位置
                    const left = col * (cellSize + gap);
                    const top = row * (cellSize + gap);

                    tile.style.left = `${left}px`;
                    tile.style.top = `${top}px`;
                    tile.style.width = `${cellSize}px`;
                    tile.style.height = `${cellSize}px`;

                    this.tileContainer.appendChild(tile);
                }
            }
        }
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});