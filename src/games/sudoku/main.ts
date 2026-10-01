import './style.css'

type Difficulty = 'easy' | 'medium' | 'hard'

interface DifficultyConfig {
    holes: number
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
    easy: { holes: 30 },
    medium: { holes: 40 },
    hard: { holes: 50 }
}

const DIFFICULTY_TEXT: Record<Difficulty, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
}

class Sudoku {
    private currentDifficulty: Difficulty = 'easy'
    private board: number[][] = []
    private solution: number[][] = []
    private initialBoard: number[][] = []
    private selectedCell: { row: number; col: number } | null = null
    private timer = 0
    private hintCount = 0
    private timerInterval: number | null = null

    private readonly gameBoard: HTMLElement
    private readonly difficultyDisplay: HTMLElement
    private readonly timerElement: HTMLElement
    private readonly newGameBtn: HTMLElement
    private readonly gameMessage: HTMLElement
    private readonly retryBtn: HTMLElement
    private readonly difficultyBtns: NodeListOf<HTMLButtonElement>
    private readonly numBtns: NodeListOf<HTMLButtonElement>
    private readonly hintBtn: HTMLElement
    private readonly checkBtn: HTMLElement

    constructor() {
        this.gameBoard = document.getElementById('game-board')!
        this.difficultyDisplay = document.getElementById('difficulty-display')!
        this.timerElement = document.getElementById('timer')!
        this.newGameBtn = document.getElementById('new-game-btn')!
        this.gameMessage = document.getElementById('game-message')!
        this.retryBtn = document.querySelector('.retry-btn')!
        this.difficultyBtns = document.querySelectorAll<HTMLButtonElement>('.difficulty-btn')
        this.numBtns = document.querySelectorAll<HTMLButtonElement>('.num-btn')
        this.hintBtn = document.getElementById('hint-btn')!
        this.checkBtn = document.getElementById('check-btn')!

        this.init()
    }

    private init(): void {
        this.setupEventListeners()
        this.startNewGame()
    }

    private setupEventListeners(): void {
        this.newGameBtn.addEventListener('click', () => this.startNewGame())
        this.retryBtn.addEventListener('click', () => this.startNewGame())

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDifficulty = (btn.dataset.difficulty as Difficulty) ?? 'easy'
                this.difficultyBtns.forEach(b => b.classList.remove('active'))
                btn.classList.add('active')
                this.startNewGame()
            })
        })

        this.numBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.dataset.num ?? '0', 10)
                this.fillNumber(num)
            })
        })

        this.hintBtn.addEventListener('click', () => this.giveHint())
        this.checkBtn.addEventListener('click', () => this.checkBoard())

        document.addEventListener('keydown', e => this.handleKeyPress(e))
    }

    private startNewGame(): void {
        this.stopTimer()
        this.timer = 0
        this.hintCount = 0
        this.timerElement.textContent = '00:00'

        this.solution = this.generateSolution()
        this.board = this.generatePuzzle(this.solution)
        this.initialBoard = this.board.map(row => [...row])
        this.selectedCell = null

        this.difficultyDisplay.textContent = DIFFICULTY_TEXT[this.currentDifficulty]

        this.hideGameMessage()
        this.renderBoard()
        this.startTimer()
    }

    private generateSolution(): number[][] {
        const board = Array.from({ length: 9 }, () => Array<number>(9).fill(0))
        this.solveSudoku(board)
        return board
    }

    private solveSudoku(board: number[][]): boolean {
        const empty = this.findEmptyCell(board)
        if (!empty) return true

        const [row, col] = empty
        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])

        for (const num of numbers) {
            if (this.isValidPlacement(board, row, col, num)) {
                board[row][col] = num
                if (this.solveSudoku(board)) return true
                board[row][col] = 0
            }
        }

        return false
    }

    // 只数解的数量，最多数到 2 就返回（用于唯一性检查）
    private countSolutions(board: number[][], limit = 2): number {
        const empty = this.findEmptyCell(board)
        if (!empty) return 1

        const [row, col] = empty
        let count = 0

        for (let num = 1; num <= 9; num++) {
            if (this.isValidPlacement(board, row, col, num)) {
                board[row][col] = num
                count += this.countSolutions(board, limit - count)
                board[row][col] = 0
                if (count >= limit) return count
            }
        }

        return count
    }

    private findEmptyCell(board: number[][]): [number, number] | null {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) return [row, col]
            }
        }
        return null
    }

    private isValidPlacement(board: number[][], row: number, col: number, num: number): boolean {
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num) return false
            if (board[i][col] === num) return false
        }

        const boxRow = Math.floor(row / 3) * 3
        const boxCol = Math.floor(col / 3) * 3
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false
            }
        }

        return true
    }

    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[array[i], array[j]] = [array[j], array[i]]
        }
        return array
    }

    // 挖洞并保证唯一解
    private generatePuzzle(solution: number[][]): number[][] {
        const puzzle = solution.map(row => [...row])
        const holes = DIFFICULTIES[this.currentDifficulty].holes
        const positions: [number, number][] = []

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                positions.push([row, col])
            }
        }
        this.shuffleArray(positions)

        let removed = 0
        for (const [row, col] of positions) {
            if (removed >= holes) break

            const backup = puzzle[row][col]
            puzzle[row][col] = 0

            // 检查是否仍然只有唯一解
            const test = puzzle.map(r => [...r])
            if (this.countSolutions(test) !== 1) {
                puzzle[row][col] = backup
            } else {
                removed++
            }
        }

        return puzzle
    }

    private renderBoard(): void {
        this.gameBoard.innerHTML = ''

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div')
                cell.className = 'cell'
                cell.dataset.row = String(row)
                cell.dataset.col = String(col)

                if (this.initialBoard[row][col] !== 0) {
                    cell.classList.add('fixed')
                    cell.textContent = String(this.initialBoard[row][col])
                } else if (this.board[row][col] !== 0) {
                    cell.textContent = String(this.board[row][col])
                }

                cell.addEventListener('click', () => this.selectCell(row, col))
                this.gameBoard.appendChild(cell)
            }
        }
    }

    private clearHighlights(): void {
        this.gameBoard.querySelectorAll<HTMLElement>('.cell').forEach(cell => {
            cell.classList.remove('selected', 'highlighted')
        })
    }

    private selectCell(row: number, col: number): void {
        if (this.initialBoard[row][col] !== 0) return

        this.clearHighlights()

        const cell = this.getCell(row, col)
        if (!cell) return

        cell.classList.add('selected')
        this.selectedCell = { row, col }

        const num = this.board[row][col]
        if (num !== 0) this.highlightSameNumbers(num)
        this.highlightRelated(row, col)
    }

    private highlightSameNumbers(num: number): void {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === num) {
                    const cell = this.getCell(row, col)
                    if (cell) cell.classList.add('highlighted')
                }
            }
        }
    }

    private highlightRelated(row: number, col: number): void {
        for (let c = 0; c < 9; c++) {
            const cell = this.getCell(row, c)
            if (cell) cell.classList.add('highlighted')
        }
        for (let r = 0; r < 9; r++) {
            const cell = this.getCell(r, col)
            if (cell) cell.classList.add('highlighted')
        }
        const boxRow = Math.floor(row / 3) * 3
        const boxCol = Math.floor(col / 3) * 3
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cell = this.getCell(boxRow + i, boxCol + j)
                if (cell) cell.classList.add('highlighted')
            }
        }
    }

    private fillNumber(num: number): void {
        if (!this.selectedCell) return

        const { row, col } = this.selectedCell
        if (this.initialBoard[row][col] !== 0) return

        this.board[row][col] = num

        const cell = this.getCell(row, col)
        if (!cell) return

        cell.textContent = num === 0 ? '' : String(num)
        cell.classList.remove('error', 'correct')

        if (num !== 0) {
            if (num === this.solution[row][col]) {
                cell.classList.add('correct')
            } else {
                cell.classList.add('error')
            }
        }

        // 重新高亮相关格
        this.clearHighlights()
        if (num !== 0) cell.classList.add('selected')
        if (num !== 0) this.highlightSameNumbers(num)
        this.highlightRelated(row, col)

        this.checkCompletion()
    }

    private handleKeyPress(e: KeyboardEvent): void {
        const key = e.key

        if (key >= '1' && key <= '9') {
            e.preventDefault()
            this.fillNumber(parseInt(key, 10))
            return
        }

        if (key === 'Backspace' || key === 'Delete' || key === '0') {
            e.preventDefault()
            this.fillNumber(0)
            return
        }

        if (!this.selectedCell) return
        let { row, col } = this.selectedCell

        if (key === 'ArrowUp' && row > 0) row--
        else if (key === 'ArrowDown' && row < 8) row++
        else if (key === 'ArrowLeft' && col > 0) col--
        else if (key === 'ArrowRight' && col < 8) col++
        else return

        e.preventDefault()
        // 跳过 fixed 格，找下一个可选格
        for (let step = 0; step < 81; step++) {
            if (this.initialBoard[row][col] === 0) break
            if (key === 'ArrowUp') row = row > 0 ? row - 1 : row
            else if (key === 'ArrowDown') row = row < 8 ? row + 1 : row
            else if (key === 'ArrowLeft') col = col > 0 ? col - 1 : col
            else if (key === 'ArrowRight') col = col < 8 ? col + 1 : col
        }

        this.selectCell(row, col)
    }

    private giveHint(): void {
        // 找空格或已填但错误的格子
        const candidates: { row: number; col: number }[] = []
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.initialBoard[row][col] !== 0) continue
                if (this.board[row][col] !== this.solution[row][col]) {
                    candidates.push({ row, col })
                }
            }
        }

        if (candidates.length === 0) return

        const { row, col } = candidates[Math.floor(Math.random() * candidates.length)]
        this.board[row][col] = this.solution[row][col]
        this.hintCount++

        const cell = this.getCell(row, col)
        if (cell) {
            cell.textContent = String(this.solution[row][col])
            cell.classList.remove('error', 'highlighted', 'selected')
            cell.classList.add('correct')
        }

        this.checkCompletion()
    }

    private checkBoard(): void {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0) continue
                if (this.initialBoard[row][col] !== 0) continue

                const cell = this.getCell(row, col)
                if (!cell) continue

                if (this.board[row][col] === this.solution[row][col]) {
                    cell.classList.add('correct')
                    cell.classList.remove('error')
                } else {
                    cell.classList.add('error')
                    cell.classList.remove('correct')
                }
            }
        }
    }

    private checkCompletion(): boolean {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] !== this.solution[row][col]) return false
            }
        }
        this.gameWon()
        return true
    }

    private gameWon(): void {
        this.stopTimer()
        this.showGameMessage(true)
    }

    private getCell(row: number, col: number): HTMLElement | null {
        return this.gameBoard.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            this.timer++
            const minutes = Math.floor(this.timer / 60).toString().padStart(2, '0')
            const seconds = (this.timer % 60).toString().padStart(2, '0')
            this.timerElement.textContent = `${minutes}:${seconds}`
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
        if (!p) return

        if (won) {
            this.gameMessage.classList.add('game-won')
            const minutes = Math.floor(this.timer / 60).toString().padStart(2, '0')
            const seconds = (this.timer % 60).toString().padStart(2, '0')
            p.innerHTML = `🎉 恭喜获胜！<br><br>总用时：${minutes}:${seconds}<br>提示次数：${this.hintCount}`
        } else {
            this.gameMessage.classList.add('game-lost')
            p.textContent = '游戏结束'
        }
    }

    private hideGameMessage(): void {
        this.gameMessage.style.display = 'none'
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Sudoku()
})