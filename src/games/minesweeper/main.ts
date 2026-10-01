import './style.css'

type Difficulty = 'easy' | 'medium' | 'hard'

interface DifficultyConfig {
    rows: number
    cols: number
    mines: number
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
}

class Minesweeper {
    private currentDifficulty: Difficulty = 'easy'
    private rows = 0
    private cols = 0
    private totalMines = 0
    private board: number[][] = []
    private revealed: boolean[][] = []
    private flagged: boolean[][] = []
    private gameOver = false
    private firstClick = true
    private timer = 0
    private timerInterval: number | null = null

    private readonly gameBoard: HTMLElement
    private readonly minesCountElement: HTMLElement
    private readonly timerElement: HTMLElement
    private readonly resetBtn: HTMLElement
    private readonly gameMessage: HTMLElement
    private readonly retryBtn: HTMLElement
    private readonly difficultyBtns: NodeListOf<HTMLButtonElement>

    constructor() {
        this.gameBoard = document.getElementById('game-board')!
        this.minesCountElement = document.getElementById('mines-count')!
        this.timerElement = document.getElementById('timer')!
        this.resetBtn = document.getElementById('reset-btn')!
        this.gameMessage = document.getElementById('game-message')!
        this.retryBtn = document.querySelector('.retry-btn')!
        this.difficultyBtns = document.querySelectorAll<HTMLButtonElement>('.difficulty-btn')

        this.init()
    }

    private init(): void {
        this.setupEventListeners()
        this.startNewGame()
    }

    private setupEventListeners(): void {
        this.resetBtn.addEventListener('click', () => this.startNewGame())
        this.retryBtn.addEventListener('click', () => this.startNewGame())

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDifficulty = (btn.dataset.difficulty as Difficulty) ?? 'easy'
                this.difficultyBtns.forEach(b => b.classList.remove('active'))
                btn.classList.add('active')
                this.startNewGame()
            })
        })
    }

    private startNewGame(): void {
        this.stopTimer()
        this.timer = 0
        this.timerElement.textContent = '000'

        const config = DIFFICULTIES[this.currentDifficulty]
        this.rows = config.rows
        this.cols = config.cols
        this.totalMines = config.mines

        this.board = Array.from({ length: this.rows }, () => Array<number>(this.cols).fill(0))
        this.revealed = Array.from({ length: this.rows }, () => Array<boolean>(this.cols).fill(false))
        this.flagged = Array.from({ length: this.rows }, () => Array<boolean>(this.cols).fill(false))
        this.gameOver = false
        this.firstClick = true

        this.updateMinesCount()
        this.hideGameMessage()
        this.renderBoard()
    }

    private placeMines(excludeRow: number, excludeCol: number): void {
        let minesPlaced = 0
        while (minesPlaced < this.totalMines) {
            const row = Math.floor(Math.random() * this.rows)
            const col = Math.floor(Math.random() * this.cols)
            if (this.board[row][col] !== -1 && !(row === excludeRow && col === excludeCol)) {
                this.board[row][col] = -1
                minesPlaced++
            }
        }
        this.calculateNumbers()
    }

    private calculateNumbers(): void {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === -1) continue
                let count = 0
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const r = row + i
                        const c = col + j
                        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c] === -1) {
                            count++
                        }
                    }
                }
                this.board[row][col] = count
            }
        }
    }

    private renderBoard(): void {
        this.gameBoard.innerHTML = ''

        let cellSize: number
        if (this.currentDifficulty === 'hard') cellSize = 25
        else if (this.currentDifficulty === 'medium') cellSize = 28
        else cellSize = 30

        this.gameBoard.style.gridTemplateColumns = `repeat(${this.cols}, ${cellSize}px)`

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div')
                cell.className = 'cell'
                cell.dataset.row = String(row)
                cell.dataset.col = String(col)
                cell.style.width = `${cellSize}px`
                cell.style.height = `${cellSize}px`
                cell.style.fontSize = `${cellSize * 0.5}px`

                cell.addEventListener('click', () => this.handleClick(row, col))
                cell.addEventListener('contextmenu', e => this.handleRightClick(e, row, col))

                this.gameBoard.appendChild(cell)
            }
        }
    }

    private handleClick(row: number, col: number): void {
        if (this.gameOver || this.flagged[row][col] || this.revealed[row][col]) return

        if (this.firstClick) {
            this.firstClick = false
            this.placeMines(row, col)
            this.startTimer()
        }

        if (this.board[row][col] === -1) {
            this.explode(row, col)
        } else {
            this.revealCell(row, col)
            this.checkWin()
        }
    }

    private handleRightClick(e: MouseEvent, row: number, col: number): void {
        e.preventDefault()
        if (this.gameOver || this.revealed[row][col]) return

        if (this.firstClick) {
            this.firstClick = false
            this.placeMines(row, col)
            this.startTimer()
        }

        this.flagged[row][col] = !this.flagged[row][col]
        this.updateCell(row, col)
        this.updateMinesCount()
    }

    private revealCell(row: number, col: number): void {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return
        if (this.revealed[row][col] || this.flagged[row][col]) return

        this.revealed[row][col] = true
        this.updateCell(row, col)

        if (this.board[row][col] === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue
                    this.revealCell(row + i, col + j)
                }
            }
        }
    }

    private explode(row: number, col: number): void {
        this.gameOver = true
        this.stopTimer()
        this.revealed[row][col] = true
        this.updateCell(row, col)

        // 修复：标记爆炸格，让它和其他地雷区分开
        const explodedCell = this.getCell(row, col)
        if (explodedCell) explodedCell.classList.add('exploded')

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] === -1 && !(r === row && c === col)) {
                    this.revealed[r][c] = true
                    this.updateCell(r, c)
                } else if (this.flagged[r][c] && this.board[r][c] !== -1) {
                    const cell = this.getCell(r, c)
                    if (cell) cell.classList.add('mine-wrong')
                }
            }
        }

        this.showGameMessage(false)
    }

    private checkWin(): void {
        let revealedCount = 0
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.revealed[row][col]) revealedCount++
            }
        }

        if (revealedCount === this.rows * this.cols - this.totalMines) {
            this.gameOver = true
            this.stopTimer()
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    if (this.board[row][col] === -1) {
                        this.flagged[row][col] = true
                        this.updateCell(row, col)
                    }
                }
            }
            // 修复：胜利后同步剩余雷数
            this.updateMinesCount()
            this.showGameMessage(true)
        }
    }

    private updateCell(row: number, col: number): void {
        const cell = this.getCell(row, col)
        if (!cell) return

        if (this.revealed[row][col]) {
            cell.classList.add('revealed')

            if (this.board[row][col] === -1) {
                cell.classList.add('mine')
            } else if (this.board[row][col] > 0) {
                cell.textContent = String(this.board[row][col])
                cell.dataset.num = String(this.board[row][col])
            }
        }

        cell.classList.toggle('flagged', this.flagged[row][col])
    }

    private getCell(row: number, col: number): HTMLElement | null {
        return this.gameBoard.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)
    }

    private updateMinesCount(): void {
        let flagCount = 0
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.flagged[row][col]) flagCount++
            }
        }
        this.minesCountElement.textContent = String(this.totalMines - flagCount)
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            this.timer++
            this.timerElement.textContent = String(this.timer).padStart(3, '0')
        }, 1000)
    }

    private stopTimer(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval)
            this.timerInterval = null
        }
    }

    private showGameMessage(won: boolean): void {
        this.gameMessage.style.display = 'flex'
        this.gameMessage.className = 'game-message'
        const p = this.gameMessage.querySelector('p')
        if (won) {
            this.gameMessage.classList.add('game-won')
            if (p) p.textContent = '🎉 恭喜获胜！'
        } else {
            this.gameMessage.classList.add('game-over')
            if (p) p.textContent = '💣 游戏结束！'
        }
    }

    private hideGameMessage(): void {
        this.gameMessage.style.display = 'none'
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper()
})