import '../../styles/theme.css'
import './style.css'

type Direction = 'up' | 'down' | 'left' | 'right'
type Position = { row: number; col: number }
type ProcessResult = { line: number[]; moved: boolean; mergedIndices: number[] }

class Game2048 {
    private readonly size = 4
    private grid: number[][] = []
    private score = 0
    private bestScore: number
    private gameOver = false
    private gameWon = false
    private hasWonOnce = false

    private readonly tileContainer: HTMLElement
    private readonly scoreElement: HTMLElement
    private readonly bestScoreElement: HTMLElement
    private readonly gameMessage: HTMLElement
    private readonly messageTitle: HTMLElement
    private readonly messageDesc: HTMLElement
    private readonly newGameBtn: HTMLElement
    private readonly retryBtn: HTMLElement

    constructor() {
        this.bestScore = parseInt(localStorage.getItem('bestScore2048') ?? '0', 10) || 0
        this.tileContainer = document.getElementById('tile-container')!
        this.scoreElement = document.getElementById('score')!
        this.bestScoreElement = document.getElementById('best-score')!
        this.gameMessage = document.getElementById('game-message')!
        this.messageTitle = document.getElementById('game-message-title')!
        this.messageDesc = document.getElementById('game-message-desc')!
        this.newGameBtn = document.getElementById('new-game-btn')!
        this.retryBtn = document.getElementById('retry-btn')!

        this.buildGridBackground()
        this.init()
    }

    private buildGridBackground(): void {
        const gridBg = document.getElementById('grid-bg')
        if (!gridBg) return
        gridBg.innerHTML = ''
        for (let i = 0; i < 16; i++) {
            gridBg.appendChild(document.createElement('div'))
        }
    }

    private init(): void {
        this.setupEventListeners()
        this.startNewGame()
        window.addEventListener('resize', () => this.render())
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', e => this.handleKeyDown(e))
        this.newGameBtn.addEventListener('click', () => this.startNewGame())
        this.retryBtn.addEventListener('click', () => this.startNewGame())

        let touchStartX: number | null = null
        let touchStartY: number | null = null
        const gameContainer = document.querySelector('.board-2048')!

        gameContainer.addEventListener('touchstart', e => {
            const touch = (e as TouchEvent).touches[0]
            touchStartX = touch.clientX
            touchStartY = touch.clientY
        }, { passive: true })

        gameContainer.addEventListener('touchend', e => {
            if (touchStartX === null || touchStartY === null) return
            const touch = (e as TouchEvent).changedTouches[0]
            const diffX = touch.clientX - touchStartX
            const diffY = touch.clientY - touchStartY
            const minSwipe = 30

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > minSwipe) this.move(diffX > 0 ? 'right' : 'left')
            } else {
                if (Math.abs(diffY) > minSwipe) this.move(diffY > 0 ? 'down' : 'up')
            }
            touchStartX = null
            touchStartY = null
        }, { passive: true })
    }

    private startNewGame(): void {
        this.grid = Array.from({ length: this.size }, () => Array<number>(this.size).fill(0))
        this.score = 0
        this.gameOver = false
        this.gameWon = false
        this.hasWonOnce = false
        this.updateScore()
        this.hideGameMessage()
        this.tileContainer.innerHTML = ''

        this.addRandomTile()
        this.addRandomTile()
        this.render()
    }

    private addRandomTile(): Position | null {
        const emptyCells: Position[] = []
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) emptyCells.push({ row, col })
            }
        }
        if (emptyCells.length === 0) return null

        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
        this.grid[row][col] = Math.random() < 0.9 ? 2 : 4
        return { row, col }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (this.gameOver) return
        const keyMap: Record<string, Direction> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        }
        const dir = keyMap[e.key]
        if (dir) {
            e.preventDefault()
            this.move(dir)
        }
    }

    private move(direction: Direction): void {
        if (this.gameOver) return

        let moved = false
        const mergedPositions: Position[] = []

        if (direction === 'left' || direction === 'right') {
            for (let row = 0; row < this.size; row++) {
                const result = this.processLine(this.grid[row], direction)
                if (result.moved) moved = true
                this.grid[row] = result.line
                result.mergedIndices.forEach(col => mergedPositions.push({ row, col }))
            }
        } else {
            for (let col = 0; col < this.size; col++) {
                const line: number[] = []
                for (let row = 0; row < this.size; row++) line.push(this.grid[row][col])
                const result = this.processLine(line, direction)
                if (result.moved) moved = true
                for (let row = 0; row < this.size; row++) this.grid[row][col] = result.line[row]
                result.mergedIndices.forEach(rowIndex => mergedPositions.push({ row: rowIndex, col }))
            }
        }

        if (moved) {
            const newTile = this.addRandomTile()
            this.updateScore()
            this.render(newTile, mergedPositions)

            if (this.checkWin()) {
                this.gameWon = true
                this.hasWonOnce = true
                this.showGameMessage(true)
            } else if (this.checkGameOver()) {
                this.gameOver = true
                this.showGameMessage(false)
            }
        }
    }

    private processLine(line: number[], direction: Direction): ProcessResult {
        let moved = false
        const mergedIndices: number[] = []
        let filtered = line.filter(val => val !== 0)
        if (direction === 'right' || direction === 'down') filtered = filtered.reverse()

        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2
                this.score += filtered[i]
                filtered.splice(i + 1, 1)
                mergedIndices.push(i)
            }
        }

        while (filtered.length < this.size) filtered.push(0)

        if (direction === 'right' || direction === 'down') {
            filtered = filtered.reverse()
            for (let i = 0; i < mergedIndices.length; i++) {
                mergedIndices[i] = this.size - 1 - mergedIndices[i]
            }
        }

        for (let i = 0; i < this.size; i++) {
            if (line[i] !== filtered[i]) {
                moved = true
                break
            }
        }

        return { line: filtered, moved, mergedIndices }
    }

    private checkWin(): boolean {
        if (this.hasWonOnce) return false
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 2048) return true
            }
        }
        return false
    }

    private checkGameOver(): boolean {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) return false
            }
        }
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const current = this.grid[row][col]
                if (col < this.size - 1 && this.grid[row][col + 1] === current) return false
                if (row < this.size - 1 && this.grid[row + 1][col] === current) return false
            }
        }
        return true
    }

    private updateScore(): void {
        this.scoreElement.textContent = String(this.score)
        if (this.score > this.bestScore) {
            this.bestScore = this.score
            localStorage.setItem('bestScore2048', String(this.bestScore))
        }
        this.bestScoreElement.textContent = String(this.bestScore)
    }

    private showGameMessage(won: boolean): void {
        if (won) {
            this.messageTitle.textContent = '🎉 达成 2048！'
            this.messageDesc.innerHTML = `当前得分 <strong>${this.score}</strong>，可以继续挑战更高分`
            this.retryBtn.textContent = '再来一局'
        } else {
            this.messageTitle.textContent = '游戏结束'
            this.messageDesc.innerHTML = `本局得分 <strong>${this.score}</strong>，最高分 <strong>${this.bestScore}</strong>`
            this.retryBtn.textContent = '再试一次'
        }
        this.gameMessage.classList.add('is-open')
    }

    private hideGameMessage(): void {
        this.gameMessage.classList.remove('is-open')
    }

    private render(newTilePos: Position | null = null, mergedPositions: Position[] = []): void {
        this.tileContainer.innerHTML = ''

        const boardEl = this.tileContainer.parentElement as HTMLElement
        if (!boardEl) return

        // 从 CSS 中读取 padding 和 gap（兼容桌面/移动端）
        const style = getComputedStyle(boardEl)
        const padding = parseFloat(style.paddingLeft) || 12
        const grid = boardEl.querySelector('.board-2048__grid') as HTMLElement | null
        const gap = grid ? parseFloat(getComputedStyle(grid).columnGap) || 12 : 12

        const boardSize = boardEl.clientWidth
        const available = boardSize - padding * 2 - gap * 3
        const cellSize = available / 4

        boardEl.style.setProperty('--tile-size', `${cellSize}px`)

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.grid[row][col]
                if (value === 0) continue

                const tile = document.createElement('div')
                tile.className = `tile tile-${value > 2048 ? 'super' : value}`

                if (newTilePos && newTilePos.row === row && newTilePos.col === col) {
                    tile.classList.add('tile-new')
                }
                if (mergedPositions.some(pos => pos.row === row && pos.col === col)) {
                    tile.classList.add('tile-merged')
                }

                tile.textContent = String(value)
                tile.style.left = `${padding + col * (cellSize + gap)}px`
                tile.style.top = `${padding + row * (cellSize + gap)}px`
                tile.style.width = `${cellSize}px`
                tile.style.height = `${cellSize}px`
                tile.style.setProperty('--tile-size', `${cellSize}px`)

                this.tileContainer.appendChild(tile)
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game2048()
})