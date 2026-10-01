import './style.css'

interface Piece {
    shape: number[][]
    color: string
    x: number
    y: number
}

interface PieceTemplate {
    shape: number[][]
    color: string
}

class Tetris {
    private readonly canvas: HTMLCanvasElement
    private readonly ctx: CanvasRenderingContext2D
    private readonly nextCanvas: HTMLCanvasElement
    private readonly nextCtx: CanvasRenderingContext2D

    private readonly COLS = 10
    private readonly ROWS = 20
    private readonly BLOCK_SIZE = 30

    private board: (string | 0)[][] = []
    private score = 0
    private level = 1
    private lines = 0
    private gameOver = false
    private paused = false
    private gameStarted = false

    private currentPiece: Piece | null = null
    private nextPiece: Piece | null = null
    private dropInterval = 1000
    private lastDropTime = 0

    private readonly pieces: PieceTemplate[] = [
        { shape: [[1, 1, 1, 1]], color: '#00f5ff' },
        { shape: [[1, 1], [1, 1]], color: '#ffeb3b' },
        { shape: [[0, 1, 0], [1, 1, 1]], color: '#9c27b0' },
        { shape: [[0, 1, 1], [1, 1, 0]], color: '#4caf50' },
        { shape: [[1, 1, 0], [0, 1, 1]], color: '#f44336' },
        { shape: [[1, 0, 0], [1, 1, 1]], color: '#2196f3' },
        { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff9800' }
    ]

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
        this.ctx = this.canvas.getContext('2d')!
        this.nextCanvas = document.getElementById('nextCanvas') as HTMLCanvasElement
        this.nextCtx = this.nextCanvas.getContext('2d')!

        this.init()
    }

    private init(): void {
        this.resetBoard()
        this.setupEventListeners()
        this.updateButtonState()
        this.draw()
    }

    private resetBoard(): void {
        this.board = []
        for (let row = 0; row < this.ROWS; row++) {
            this.board[row] = []
            for (let col = 0; col < this.COLS; col++) {
                this.board[row][col] = 0
            }
        }
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', e => this.handleKeyPress(e))

        document.getElementById('startBtn')!.addEventListener('click', () => this.startGame())
        document.getElementById('pauseBtn')!.addEventListener('click', () => this.togglePause())
        document.getElementById('restartBtn')!.addEventListener('click', () => this.restartGame())
        document.getElementById('playAgainBtn')!.addEventListener('click', () => this.restartGame())
    }

    private updateButtonState(): void {
        const startBtn = document.getElementById('startBtn')!
        const pauseBtn = document.getElementById('pauseBtn')!

        if (this.gameStarted && !this.gameOver) {
            startBtn.classList.add('disabled')
            pauseBtn.classList.remove('disabled')
        } else {
            startBtn.classList.remove('disabled')
            pauseBtn.classList.add('disabled')
        }
    }

    private handleKeyPress(e: KeyboardEvent): void {
        if (!this.gameStarted || this.gameOver) return

        if (e.key === 'p' || e.key === 'P') {
            this.togglePause()
            return
        }

        if (this.paused) return

        switch (e.key) {
            case 'ArrowLeft':
                this.movePiece(-1, 0)
                break
            case 'ArrowRight':
                this.movePiece(1, 0)
                break
            case 'ArrowDown':
                this.movePiece(0, 1)
                break
            case 'ArrowUp':
                this.rotatePiece()
                break
            case ' ':
                this.hardDrop()
                break
            default:
                return
        }

        e.preventDefault()
    }

    private startGame(): void {
        if (this.gameStarted) return

        this.gameStarted = true
        this.gameOver = false
        this.paused = false
        this.score = 0
        this.level = 1
        this.lines = 0
        this.dropInterval = 1000
        this.currentPiece = null
        this.nextPiece = null

        this.resetBoard()
        this.spawnPiece()
        this.updateDisplay()
        this.updateButtonState()

        this.lastDropTime = performance.now()
        requestAnimationFrame(t => this.gameLoop(t))
    }

    private restartGame(): void {
        this.gameStarted = false
        this.gameOver = false
        this.paused = false
        this.currentPiece = null
        this.nextPiece = null

        this.resetBoard()
        this.score = 0
        this.level = 1
        this.lines = 0
        this.dropInterval = 1000

        this.updateDisplay()
        this.updateButtonState()

        document.getElementById('gameOverModal')!.style.display = 'none'
        document.getElementById('pauseBtn')!.textContent = '暂停'

        this.draw()
        this.drawNextPiece()
    }

    private togglePause(): void {
        if (!this.gameStarted || this.gameOver) return

        this.paused = !this.paused
        const pauseBtn = document.getElementById('pauseBtn')!
        pauseBtn.textContent = this.paused ? '继续' : '暂停'

        if (!this.paused) {
            this.lastDropTime = performance.now()
            requestAnimationFrame(t => this.gameLoop(t))
        }
    }

    private spawnPiece(): void {
        if (!this.nextPiece) {
            this.nextPiece = this.randomPiece()
        }

        this.currentPiece = this.nextPiece
        this.nextPiece = this.randomPiece()

        this.currentPiece.x = Math.floor((this.COLS - this.currentPiece.shape[0].length) / 2)
        this.currentPiece.y = 0

        this.drawNextPiece()
        this.draw()

        if (this.checkCollision(0, 0)) {
            this.gameOver = true
            this.showGameOver()
            this.updateButtonState()
        }
    }

    private randomPiece(): Piece {
        const piece = this.pieces[Math.floor(Math.random() * this.pieces.length)]
        return {
            shape: piece.shape.map(row => [...row]),
            color: piece.color,
            x: 0,
            y: 0
        }
    }

    private movePiece(dx: number, dy: number): boolean {
        if (!this.currentPiece) return false
        if (!this.checkCollision(dx, dy)) {
            this.currentPiece.x += dx
            this.currentPiece.y += dy
            this.draw()
            return true
        }
        return false
    }

    private rotatePiece(): void {
        if (!this.currentPiece) return

        const shape = this.currentPiece.shape
        const rotated = shape[0].map((_, i) => shape.map(row => row[i]).reverse())

        const originalShape = this.currentPiece.shape
        this.currentPiece.shape = rotated

        if (this.checkCollision(0, 0)) {
            if (!this.checkCollision(-1, 0)) {
                this.currentPiece.x -= 1
            } else if (!this.checkCollision(1, 0)) {
                this.currentPiece.x += 1
            } else if (!this.checkCollision(-2, 0)) {
                this.currentPiece.x -= 2
            } else if (!this.checkCollision(2, 0)) {
                this.currentPiece.x += 2
            } else {
                this.currentPiece.shape = originalShape
            }
        }

        this.draw()
    }

    private hardDrop(): void {
        if (!this.currentPiece) return
        while (!this.checkCollision(0, 1)) {
            this.currentPiece.y++
        }
        this.lockPiece()
    }

    private checkCollision(dx: number, dy: number): boolean {
        if (!this.currentPiece) return false

        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (!this.currentPiece.shape[row][col]) continue

                const newX = this.currentPiece.x + col + dx
                const newY = this.currentPiece.y + row + dy

                if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) return true
                if (newY >= 0 && this.board[newY][newX]) return true
            }
        }
        return false
    }

    private lockPiece(): void {
        if (!this.currentPiece) return

        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (!this.currentPiece.shape[row][col]) continue

                const boardY = this.currentPiece.y + row
                const boardX = this.currentPiece.x + col

                if (boardY >= 0 && boardY < this.ROWS && boardX >= 0 && boardX < this.COLS) {
                    this.board[boardY][boardX] = this.currentPiece.color
                }
            }
        }

        this.clearLines()
        this.spawnPiece()
    }

    private clearLines(): void {
        let linesCleared = 0

        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1)
                this.board.unshift(new Array(this.COLS).fill(0))
                linesCleared++
                row++
            }
        }

        if (linesCleared > 0) {
            this.lines += linesCleared
            const points = [0, 100, 300, 500, 800]
            this.score += points[linesCleared] * this.level
            this.level = Math.floor(this.lines / 10) + 1
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100)
            this.updateDisplay()
        }
    }

    private gameLoop(currentTime: number): void {
        if (!this.gameStarted || this.gameOver || this.paused) return

        const deltaTime = currentTime - this.lastDropTime

        if (deltaTime > this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece()
            }
            this.lastDropTime = currentTime
        }

        this.draw()
        requestAnimationFrame(t => this.gameLoop(t))
    }

    private draw(): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        this.ctx.lineWidth = 1

        for (let row = 0; row <= this.ROWS; row++) {
            this.ctx.beginPath()
            this.ctx.moveTo(0, row * this.BLOCK_SIZE)
            this.ctx.lineTo(this.canvas.width, row * this.BLOCK_SIZE)
            this.ctx.stroke()
        }
        for (let col = 0; col <= this.COLS; col++) {
            this.ctx.beginPath()
            this.ctx.moveTo(col * this.BLOCK_SIZE, 0)
            this.ctx.lineTo(col * this.BLOCK_SIZE, this.canvas.height)
            this.ctx.stroke()
        }

        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const cell = this.board[row][col]
                if (cell) this.drawBlock(col, row, cell)
            }
        }

        if (this.currentPiece) {
            for (let row = 0; row < this.currentPiece.shape.length; row++) {
                for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                    if (this.currentPiece.shape[row][col]) {
                        const x = this.currentPiece.x + col
                        const y = this.currentPiece.y + row
                        if (y >= 0) this.drawBlock(x, y, this.currentPiece.color)
                    }
                }
            }

            this.drawGhostPiece()
        }
    }

    private drawBlock(x: number, y: number, color: string): void {
        const posX = x * this.BLOCK_SIZE
        const posY = y * this.BLOCK_SIZE

        this.ctx.fillStyle = color
        this.ctx.fillRect(posX + 1, posY + 1, this.BLOCK_SIZE - 2, this.BLOCK_SIZE - 2)

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        this.ctx.fillRect(posX + 1, posY + 1, this.BLOCK_SIZE - 2, 3)
        this.ctx.fillRect(posX + 1, posY + 1, 3, this.BLOCK_SIZE - 2)

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        this.ctx.fillRect(posX + this.BLOCK_SIZE - 4, posY + 1, 3, this.BLOCK_SIZE - 2)
        this.ctx.fillRect(posX + 1, posY + this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 2, 3)
    }

    private drawGhostPiece(): void {
        if (!this.currentPiece) return

        let ghostY = this.currentPiece.y
        while (!this.checkCollisionAt(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
            ghostY++
        }

        if (ghostY === this.currentPiece.y) return

        this.ctx.globalAlpha = 0.3
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const x = this.currentPiece.x + col
                    const y = ghostY + row
                    if (y >= 0) this.drawBlock(x, y, this.currentPiece.color)
                }
            }
        }
        this.ctx.globalAlpha = 1
    }

    private checkCollisionAt(x: number, y: number, shape: number[][]): boolean {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (!shape[row][col]) continue

                const newX = x + col
                const newY = y + row

                if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) return true
                if (newY >= 0 && this.board[newY][newX]) return true
            }
        }
        return false
    }

    private drawNextPiece(): void {
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height)

        if (!this.nextPiece) return

        const blockSize = 20
        const offsetX = (this.nextCanvas.width - this.nextPiece.shape[0].length * blockSize) / 2
        const offsetY = (this.nextCanvas.height - this.nextPiece.shape.length * blockSize) / 2

        for (let row = 0; row < this.nextPiece.shape.length; row++) {
            for (let col = 0; col < this.nextPiece.shape[row].length; col++) {
                if (this.nextPiece.shape[row][col]) {
                    const x = offsetX + col * blockSize
                    const y = offsetY + row * blockSize
                    this.nextCtx.fillStyle = this.nextPiece.color
                    this.nextCtx.fillRect(x, y, blockSize - 2, blockSize - 2)
                }
            }
        }
    }

    private updateDisplay(): void {
        document.getElementById('score')!.textContent = String(this.score)
        document.getElementById('level')!.textContent = String(this.level)
        document.getElementById('lines')!.textContent = String(this.lines)
    }

    private showGameOver(): void {
        document.getElementById('finalScore')!.textContent = String(this.score)
        document.getElementById('gameOverModal')!.style.display = 'block'
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Tetris()
})