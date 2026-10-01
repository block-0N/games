import '../../styles/theme.css'
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
    private clicks = 0
    private bbv = 0

    private readonly isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    private readonly gameBoard: HTMLElement
    private readonly minesCountElement: HTMLElement
    private readonly timerElement: HTMLElement
    private readonly resetBtn: HTMLElement
    private readonly gameMessage: HTMLElement
    private readonly messageTitle: HTMLElement
    private readonly messageDesc: HTMLElement
    private readonly retryBtn: HTMLElement
    private readonly difficultyBtns: NodeListOf<HTMLButtonElement>
    private readonly bbvElement: HTMLElement
    private readonly ioeElement: HTMLElement
    private readonly clicksElement: HTMLElement

    constructor() {
        this.gameBoard = document.getElementById('game-board')!
        this.minesCountElement = document.getElementById('mines-count')!
        this.timerElement = document.getElementById('timer')!
        this.resetBtn = document.getElementById('reset-btn')!
        this.gameMessage = document.getElementById('game-message')!
        this.messageTitle = document.getElementById('game-message-title')!
        this.messageDesc = document.getElementById('game-message-desc')!
        this.retryBtn = document.getElementById('retry-btn')!
        this.difficultyBtns = document.querySelectorAll<HTMLButtonElement>('.ui-segment__item')
        this.bbvElement = document.getElementById('bbv')!
        this.ioeElement = document.getElementById('ioe')!
        this.clicksElement = document.getElementById('clicks')!

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
                this.difficultyBtns.forEach(b => b.classList.remove('is-active'))
                btn.classList.add('is-active')
                this.startNewGame()
            })
        })
    }

    private startNewGame(): void {
        this.stopTimer()
        this.timer = 0
        this.clicks = 0
        this.bbv = 0
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
        this.updateStats()
        this.hideGameMessage()
        this.renderBoard()
    }

    private placeMines(excludeRow: number, excludeCol: number): void {
        let placed = 0
        while (placed < this.totalMines) {
            const row = Math.floor(Math.random() * this.rows)
            const col = Math.floor(Math.random() * this.cols)
            if (this.board[row][col] !== -1 && !(row === excludeRow && col === excludeCol)) {
                this.board[row][col] = -1
                placed++
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

    private calculate3BV(): number {
        const visited = Array.from({ length: this.rows }, () => Array<boolean>(this.cols).fill(false))
        let bbv = 0

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === 0 && !visited[row][col]) {
                    bbv++
                    this.floodFill3BV(row, col, visited)
                }
            }
        }

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] > 0 && !visited[row][col]) bbv++
            }
        }

        return bbv
    }

    private floodFill3BV(startRow: number, startCol: number, visited: boolean[][]): void {
        const queue: [number, number][] = [[startRow, startCol]]
        visited[startRow][startCol] = true

        while (queue.length > 0) {
            const [row, col] = queue.shift()!
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue
                    const nr = row + i
                    const nc = col + j
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue
                    if (visited[nr][nc] || this.board[nr][nc] === -1) continue

                    visited[nr][nc] = true
                    if (this.board[nr][nc] === 0) queue.push([nr, nc])
                }
            }
        }
    }

    private updateStats(): void {
        this.bbvElement.textContent = this.bbv > 0 ? String(this.bbv) : '-'
        this.clicksElement.textContent = String(this.clicks)
        this.ioeElement.textContent =
            this.bbv > 0 && this.clicks > 0 ? (this.bbv / this.clicks).toFixed(2) : '-'
    }

    private renderBoard(): void {
        this.gameBoard.innerHTML = ''

        let cellSize: number
        if (this.currentDifficulty === 'hard') cellSize = 26
        else if (this.currentDifficulty === 'medium') cellSize = 30
        else cellSize = 36

        this.gameBoard.style.gridTemplateColumns = `repeat(${this.cols}, ${cellSize}px)`

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div')
                cell.className = 'minesweeper-cell'
                cell.dataset.row = String(row)
                cell.dataset.col = String(col)
                cell.style.width = `${cellSize}px`
                cell.style.height = `${cellSize}px`
                cell.style.fontSize = `${cellSize * 0.5}px`

                this.bindCellEvents(cell, row, col)
                this.gameBoard.appendChild(cell)
            }
        }
    }

    private bindCellEvents(cell: HTMLElement, row: number, col: number): void {
        let longPressTimer: number | null = null
        let longPressFired = false
        let clickTimer: number | null = null

        const cancelLongPress = () => {
            if (longPressTimer !== null) {
                clearTimeout(longPressTimer)
                longPressTimer = null
            }
        }

        cell.addEventListener('contextmenu', e => {
            e.preventDefault()
            this.handleRightClick(row, col)
        })

        cell.addEventListener('touchstart', () => {
            longPressFired = false
            longPressTimer = window.setTimeout(() => {
                longPressTimer = null
                longPressFired = true
                this.handleRightClick(row, col)
            }, 450)
        }, { passive: true })

        cell.addEventListener('touchmove', cancelLongPress)
        cell.addEventListener('touchcancel', cancelLongPress)
        cell.addEventListener('touchend', cancelLongPress)

        cell.addEventListener('click', e => {
            if (longPressFired) {
                longPressFired = false
                return
            }
            e.preventDefault()

            if (this.isTouch) {
                if (clickTimer !== null) {
                    clearTimeout(clickTimer)
                    clickTimer = null
                    this.chord(row, col)
                    return
                }
                clickTimer = window.setTimeout(() => {
                    clickTimer = null
                    this.handleClick(row, col)
                }, 220)
            } else {
                this.handleClick(row, col)
            }
        })

        cell.addEventListener('mousedown', e => {
            if (e.buttons === 3) {
                e.preventDefault()
                this.chord(row, col)
            }
        })
    }

    private handleClick(row: number, col: number): void {
        if (this.gameOver || this.flagged[row][col] || this.revealed[row][col]) return

        this.clicks++

        if (this.firstClick) {
            this.firstClick = false
            this.placeMines(row, col)
            this.startTimer()
            this.bbv = this.calculate3BV()
        }

        if (this.board[row][col] === -1) {
            this.explode(row, col)
        } else {
            this.revealCell(row, col)
            this.checkWin()
        }

        this.updateStats()
    }

    private handleRightClick(row: number, col: number): void {
        if (this.gameOver || this.revealed[row][col]) return

        if (this.firstClick) {
            this.firstClick = false
            this.placeMines(row, col)
            this.startTimer()
            this.bbv = this.calculate3BV()
        }

        this.flagged[row][col] = !this.flagged[row][col]
        this.updateCell(row, col)
        this.updateMinesCount()
        this.updateStats()
    }

    private chord(row: number, col: number): void {
        if (this.gameOver || !this.revealed[row][col]) return

        const value = this.board[row][col]
        if (value <= 0) return

        let flagCount = 0
        const toReveal: [number, number][] = []

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue
                const nr = row + i
                const nc = col + j
                if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue

                if (this.flagged[nr][nc]) flagCount++
                else if (!this.revealed[nr][nc]) toReveal.push([nr, nc])
            }
        }

        if (flagCount !== value) return

        this.clicks++

        for (const [nr, nc] of toReveal) {
            if (this.board[nr][nc] === -1) {
                this.explode(nr, nc)
                this.updateStats()
                return
            }
            this.revealCell(nr, nc)
        }

        this.checkWin()
        this.updateStats()
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
        const exploded = this.getCell(row, col)
        if (exploded) exploded.classList.add('is-exploded')

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (r === row && c === col) continue

                if (this.board[r][c] === -1) {
                    if (!this.flagged[r][c]) {
                        this.revealed[r][c] = true
                        this.updateCell(r, c)
                    }
                } else if (this.flagged[r][c]) {
                    this.revealed[r][c] = true
                    this.updateCell(r, c)
                    const cell = this.getCell(r, c)
                    if (cell) cell.classList.add('is-wrong')
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

            this.updateMinesCount()
            this.showGameMessage(true)
        }
    }

    private updateCell(row: number, col: number): void {
        const cell = this.getCell(row, col)
        if (!cell) return

        if (this.revealed[row][col]) {
            cell.classList.add('is-revealed')

            if (this.board[row][col] === -1) {
                cell.classList.add('is-mine')
            } else if (this.board[row][col] > 0) {
                cell.textContent = String(this.board[row][col])
                cell.dataset.num = String(this.board[row][col])
            }
        }

        cell.classList.toggle('is-flagged', this.flagged[row][col])
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
        if (won) {
            this.messageTitle.textContent = '🎉 恭喜获胜！'
            const ioE = this.clicks > 0 ? (this.bbv / this.clicks).toFixed(2) : '-'
            this.messageDesc.innerHTML = `用时 <strong>${this.timer}</strong> 秒 · 3BV <strong>${this.bbv}</strong> · IOE <strong>${ioE}</strong>`
            this.retryBtn.textContent = '再来一局'
        } else {
            this.messageTitle.textContent = '💣 游戏结束'
            this.messageDesc.innerHTML = `坚持了 <strong>${this.timer}</strong> 秒，再试一次吧`
            this.retryBtn.textContent = '再试一次'
        }
        this.gameMessage.classList.add('is-open')
    }

    private hideGameMessage(): void {
        this.gameMessage.classList.remove('is-open')
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Minesweeper()
})