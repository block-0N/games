class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.COLS = 10;
        this.ROWS = 20;
        this.BLOCK_SIZE = 30;
        
        this.board = [];
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.gameStarted = false;
        
        this.currentPiece = null;
        this.nextPiece = null;
        this.dropInterval = 1000;
        this.lastDropTime = 0;
        
        this.pieces = [
            // I型
            {
                shape: [[1, 1, 1, 1]],
                color: '#00f5ff'
            },
            // O型
            {
                shape: [[1, 1], [1, 1]],
                color: '#ffeb3b'
            },
            // T型
            {
                shape: [[0, 1, 0], [1, 1, 1]],
                color: '#9c27b0'
            },
            // S型
            {
                shape: [[0, 1, 1], [1, 1, 0]],
                color: '#4caf50'
            },
            // Z型
            {
                shape: [[1, 1, 0], [0, 1, 1]],
                color: '#f44336'
            },
            // J型
            {
                shape: [[1, 0, 0], [1, 1, 1]],
                color: '#2196f3'
            },
            // L型
            {
                shape: [[0, 0, 1], [1, 1, 1]],
                color: '#ff9800'
            }
        ];
        
        this.init();
    }

    init() {
        this.resetBoard();
        this.setupEventListeners();
        this.draw();
    }

    resetBoard() {
        this.board = [];
        for (let row = 0; row < this.ROWS; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.COLS; col++) {
                this.board[row][col] = 0;
            }
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
    }

    handleKeyPress(e) {
        if (!this.gameStarted || this.gameOver) return;
        
        if (e.key === 'p' || e.key === 'P') {
            this.togglePause();
            return;
        }
        
        if (this.paused) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                this.movePiece(0, 1);
                break;
            case 'ArrowUp':
                this.rotatePiece();
                break;
            case ' ':
                this.hardDrop();
                break;
        }
        
        e.preventDefault();
    }

    startGame() {
        if (this.gameStarted) return;
        
        this.gameStarted = true;
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        
        this.resetBoard();
        this.spawnPiece();
        this.updateDisplay();
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.gameLoop();
    }

    restartGame() {
        this.gameStarted = false;
        this.gameOver = false;
        this.paused = false;
        
        this.resetBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        
        this.updateDisplay();
        
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        this.draw();
    }

    togglePause() {
        if (!this.gameStarted || this.gameOver) return;
        
        this.paused = !this.paused;
        document.getElementById('pauseBtn').textContent = this.paused ? '继续' : '暂停';
        
        if (!this.paused) {
            this.lastDropTime = performance.now();
            this.gameLoop();
        }
    }

    spawnPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.randomPiece();
        }
        
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.randomPiece();
        
        this.currentPiece.x = Math.floor((this.COLS - this.currentPiece.shape[0].length) / 2);
        this.currentPiece.y = 0;
        
        this.drawNextPiece();
        this.draw();
        
        if (this.checkCollision(0, 0)) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    randomPiece() {
        const piece = this.pieces[Math.floor(Math.random() * this.pieces.length)];
        return {
            shape: piece.shape.map(row => [...row]),
            color: piece.color,
            x: 0,
            y: 0
        };
    }

    movePiece(dx, dy) {
        if (!this.checkCollision(dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            this.draw();
            return true;
        }
        return false;
    }

    rotatePiece() {
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[i]).reverse()
        );
        
        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;
        
        // 检查旋转后是否碰撞，如果碰撞则尝试移动
        if (this.checkCollision(0, 0)) {
            // 尝试向左移动
            if (!this.checkCollision(-1, 0)) {
                this.currentPiece.x -= 1;
            }
            // 尝试向右移动
            else if (!this.checkCollision(1, 0)) {
                this.currentPiece.x += 1;
            }
            // 尝试向左移动两格
            else if (!this.checkCollision(-2, 0)) {
                this.currentPiece.x -= 2;
            }
            // 尝试向右移动两格
            else if (!this.checkCollision(2, 0)) {
                this.currentPiece.x += 2;
            }
            else {
                // 无法旋转，恢复原状
                this.currentPiece.shape = originalShape;
            }
        }
        
        this.draw();
    }

    hardDrop() {
        while (!this.checkCollision(0, 1)) {
            this.currentPiece.y++;
        }
        this.lockPiece();
    }

    checkCollision(dx, dy) {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const newX = this.currentPiece.x + col + dx;
                    const newY = this.currentPiece.y + row + dy;
                    
                    if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    lockPiece() {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const boardY = this.currentPiece.y + row;
                    const boardX = this.currentPiece.x + col;
                    
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1);
                this.board.unshift(new Array(this.COLS).fill(0));
                linesCleared++;
                row++;
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // 计分系统
            const points = [0, 100, 300, 500, 800];
            this.score += points[linesCleared] * this.level;
            
            // 升级系统
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            
            this.updateDisplay();
        }
    }

    gameLoop(currentTime = 0) {
        if (!this.gameStarted || this.gameOver || this.paused) return;
        
        const deltaTime = currentTime - this.lastDropTime;
        
        if (deltaTime > this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece();
            }
            this.lastDropTime = currentTime;
        }
        
        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let row = 0; row <= this.ROWS; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * this.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, row * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        for (let col = 0; col <= this.COLS; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(col * this.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制已锁定的方块
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }
        
        // 绘制当前方块
        if (this.currentPiece) {
            for (let row = 0; row < this.currentPiece.shape.length; row++) {
                for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                    if (this.currentPiece.shape[row][col]) {
                        const x = this.currentPiece.x + col;
                        const y = this.currentPiece.y + row;
                        if (y >= 0) {
                            this.drawBlock(x, y, this.currentPiece.color);
                        }
                    }
                }
            }
            
            // 绘制预览落点
            this.drawGhostPiece();
        }
    }

    drawBlock(x, y, color) {
        const posX = x * this.BLOCK_SIZE;
        const posY = y * this.BLOCK_SIZE;
        
        // 主体
        this.ctx.fillStyle = color;
        this.ctx.fillRect(posX + 1, posY + 1, this.BLOCK_SIZE - 2, this.BLOCK_SIZE - 2);
        
        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(posX + 1, posY + 1, this.BLOCK_SIZE - 2, 3);
        this.ctx.fillRect(posX + 1, posY + 1, 3, this.BLOCK_SIZE - 2);
        
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(posX + this.BLOCK_SIZE - 4, posY + 1, 3, this.BLOCK_SIZE - 2);
        this.ctx.fillRect(posX + 1, posY + this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 2, 3);
    }

    drawGhostPiece() {
        let ghostY = this.currentPiece.y;
        
        while (!this.checkCollisionAt(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
            ghostY++;
        }
        
        this.ctx.globalAlpha = 0.3;
        
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const x = this.currentPiece.x + col;
                    const y = ghostY + row;
                    if (y >= 0) {
                        this.drawBlock(x, y, this.currentPiece.color);
                    }
                }
            }
        }
        
        this.ctx.globalAlpha = 1;
    }

    checkCollisionAt(x, y, shape) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (!this.nextPiece) return;
        
        const blockSize = 20;
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2;
        
        for (let row = 0; row < this.nextPiece.shape.length; row++) {
            for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                if (this.nextPiece.shape[row][col]) {
                    const x = offsetX + col * blockSize;
                    const y = offsetY + row * blockSize;
                    
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(x, y, blockSize - 2, blockSize - 2);
                }
            }
        }
    }

    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverModal').style.display = 'block';
        document.getElementById('pauseBtn').disabled = true;
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new Tetris();
});