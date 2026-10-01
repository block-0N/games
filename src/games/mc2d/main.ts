import '../../styles/theme.css'
import './style.css'
import { World } from './world'
import { Renderer } from './renderer'
import {
    BlockId,
    BLOCKS,
    HOTBAR_SIZE,
    MAX_STACK,
    GRAVITY_INTERVAL,
    MOVE_HUNGER_STEP,
    MAX_HEALTH,
    MAX_HUNGER,
    STARVE_INTERVAL,
    HEAL_INTERVAL
} from './constants'

interface Stack {
    id: number | null
    count: number
}

interface Player {
    x: number
    y: number
    sneaking: boolean
    onGround: boolean
    lastFallTime: number
}

const BACKPACK_SIZE = 27
const HOLD_REPEAT_MS = 90

class MC2D {
    private readonly canvas: HTMLCanvasElement
    private readonly ctx: CanvasRenderingContext2D
    private readonly renderer: Renderer
    private readonly world: World

    private player: Player
    private camera = { x: 0, y: 0 }

    private hotbar: Stack[] = []
    private backpack: Stack[] = []
    private selectedSlot = 0
    private backpackOpen = false
    private selectedBackpackSlot = -1  // -1 表示没有选中

    private health = MAX_HEALTH
    private hunger = MAX_HUNGER
    private moveCount = 0
    private lastStarveTick = 0
    private lastHealTick = 0

    private cellSize = 32
    private lastTime = 0
    private running = false
    private paused = false
    private gameOver = false
    private jumpLockedUntil = 0

    private hoverX = -1
    private hoverY = -1

    private mouseDownButton = -1
    private holdTimer: number | null = null
    private holdActive = false

    constructor() {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement
        this.ctx = this.canvas.getContext('2d')!
        this.renderer = new Renderer(this.ctx, this.canvas)
        this.world = new World()

        const spawnX = Math.floor(this.world.cols / 2)
        const spawnY = this.world.findGroundY(spawnX) - 2
        this.player = {
            x: spawnX,
            y: spawnY,
            sneaking: false,
            onGround: false,
            lastFallTime: 0
        }

        this.hotbar = Array.from({ length: HOTBAR_SIZE }, () => ({ id: null, count: 0 }))
        this.backpack = Array.from({ length: BACKPACK_SIZE }, () => ({ id: null, count: 0 }))

        this.init()
    }

    private init(): void {
        this.bindEvents()
        this.resize()
        this.updateHud()
        this.updateHotbarUi()
        this.renderBackpack()
        this.start()
    }

    // ==================== 尺寸 ====================

    private resize(): void {
        const wrapper = this.canvas.parentElement!
        const rect = wrapper.getBoundingClientRect()
        const isMobile = window.innerWidth < 640
        const targetCols = isMobile ? 24 : 40
        this.cellSize = Math.max(16, Math.floor(rect.width / targetCols))

        const cols = Math.ceil(rect.width / this.cellSize)
        const rows = Math.ceil(rect.height / this.cellSize)

        this.canvas.width = cols * this.cellSize
        this.canvas.height = rows * this.cellSize
        this.canvas.style.width = `${this.canvas.width}px`
        this.canvas.style.height = `${this.canvas.height}px`

        this.camera.x = this.player.x - cols / 2
        this.camera.y = this.player.y - rows / 2
    }

    // ==================== 事件 ====================

    private bindEvents(): void {
        window.addEventListener('resize', () => this.resize())

        document.addEventListener('keydown', e => this.onKeyDown(e))
        document.addEventListener('keyup', e => this.onKeyUp(e))

        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e))
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e))
        this.canvas.addEventListener('mouseleave', () => {
            this.hoverX = -1
            this.hoverY = -1
            this.stopHold()
        })
        this.canvas.addEventListener('contextmenu', e => e.preventDefault())

        document.addEventListener('mouseup', () => this.stopHold())

        this.canvas.addEventListener(
            'wheel',
            e => {
                e.preventDefault()
                if (e.deltaY > 0) this.selectedSlot = (this.selectedSlot + 1) % HOTBAR_SIZE
                else if (e.deltaY < 0) this.selectedSlot = (this.selectedSlot - 1 + HOTBAR_SIZE) % HOTBAR_SIZE
                this.updateHotbarUi()
            },
            { passive: false }
        )

        document.getElementById('pause-btn')!.addEventListener('click', () => this.togglePause())
        document.getElementById('restart-btn')!.addEventListener('click', () => this.restart())
        document.getElementById('play-again-btn')!.addEventListener('click', () => this.restart())
        document.getElementById('backpack-btn')!.addEventListener('click', () => this.toggleBackpack())
        document.getElementById('backpack-close')!.addEventListener('click', () => this.toggleBackpack())

        document.querySelectorAll<HTMLElement>('.mc2d-slot').forEach((el, idx) => {
            el.addEventListener('click', () => {
                this.selectedSlot = idx
                this.updateHotbarUi()
            })
        })

        // 背包格子
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot').forEach((el, idx) => {
            el.addEventListener('click', () => this.onBackpackSlotClick(idx))
        })
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (this.gameOver) return

        if (e.key === 'p' || e.key === 'P') {
            this.togglePause()
            return
        }

        // E 键开背包
        if (e.key === 'e' || e.key === 'E') {
            if (this.paused) return
            this.toggleBackpack()
            e.preventDefault()
            return
        }

        // Escape 关背包
        if (e.key === 'Escape' && this.backpackOpen) {
            this.toggleBackpack()
            return
        }

        if (this.paused || this.backpackOpen) return

        if (e.key >= '1' && e.key <= '9') {
            this.selectedSlot = parseInt(e.key, 10) - 1
            this.updateHotbarUi()
            return
        }

        if (e.key === 'Shift') {
            this.player.sneaking = true
            return
        }

        const beforeX = this.player.x
        const beforeY = this.player.y

        switch (e.key) {
            case 'a':
            case 'A':
            case 'ArrowLeft':
                this.tryMove(-1, 0)
                break
            case 'd':
            case 'D':
            case 'ArrowRight':
                this.tryMove(1, 0)
                break
            case 'w':
            case 'W':
            case 'ArrowUp':
                this.tryJump()
                break
            case 's':
            case 'S':
            case 'ArrowDown':
                this.tryMove(0, 1)
                break
        }

        if (beforeX !== this.player.x || beforeY !== this.player.y) {
            this.trackMovementHunger()
        }

        e.preventDefault()
    }

    private onKeyUp(e: KeyboardEvent): void {
        if (e.key === 'Shift') {
            if (!this.world.isSolid(this.player.x, this.player.y - 1)) {
                this.player.sneaking = false
            }
        }
    }

    private onMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect()
        const scaleX = this.canvas.width / rect.width
        const scaleY = this.canvas.height / rect.height
        const mx = (e.clientX - rect.left) * scaleX
        const my = (e.clientY - rect.top) * scaleY

        this.hoverX = Math.floor(mx / this.cellSize + this.camera.x)
        this.hoverY = Math.floor(my / this.cellSize + this.camera.y)
    }

    private onMouseDown(e: MouseEvent): void {
        if (!this.running || this.paused || this.gameOver || this.backpackOpen) return
        if (this.hoverX < 0 || this.hoverY < 0) return
        this.mouseDownButton = e.button
        this.applyMouseAction(e.button)
        this.startHold()
    }

    private startHold(): void {
        this.clearHoldTimer()
        this.holdActive = true
        this.holdTimer = window.setTimeout(() => {
            this.holdTimer = null
            if (!this.holdActive) return
            this.applyMouseAction(this.mouseDownButton)
            this.startHold()
        }, HOLD_REPEAT_MS)
    }

    private clearHoldTimer(): void {
        if (this.holdTimer !== null) {
            clearTimeout(this.holdTimer)
            this.holdTimer = null
        }
    }

    private stopHold(): void {
        this.holdActive = false
        this.clearHoldTimer()
        this.mouseDownButton = -1
    }

    private applyMouseAction(button: number): void {
        if (this.hoverX < 0 || this.hoverY < 0) return

        if (button === 0) {
            this.breakBlock(this.hoverX, this.hoverY)
        } else if (button === 2) {
            this.placeBlock(this.hoverX, this.hoverY)
        }
    }

    // ==================== 玩家操作 ====================

    private tryMove(dx: number, dy: number): void {
        const nx = this.player.x + dx
        const ny = this.player.y + dy
        if (!this.canOccupy(nx, ny)) return
        this.player.x = nx
        this.player.y = ny
    }

    private tryJump(): void {
        if (!this.player.onGround) return
        const ny = this.player.y - 1
        if (!this.canOccupy(this.player.x, ny)) return
        this.player.y = ny
        this.player.onGround = false
        this.jumpLockedUntil = performance.now() + 260
    }

    private canOccupy(x: number, y: number): boolean {
        if (this.world.isSolid(x, y)) return false
        if (!this.player.sneaking && this.world.isSolid(x, y - 1)) return false
        return true
    }

    // ==================== 挖掘/放置 ====================

    private breakBlock(x: number, y: number): void {
        const id = this.world.get(x, y)
        if (id === BlockId.Air) return
        if (BLOCKS[id].unbreakable) return

        this.world.set(x, y, BlockId.Air)
        this.addItem(id, 1)
    }

    private placeBlock(x: number, y: number): void {
        if (this.world.get(x, y) !== BlockId.Air) return

        if (!this.player.sneaking) {
            if (
                (x === this.player.x && y === this.player.y) ||
                (x === this.player.x && y === this.player.y - 1)
            )
                return
        } else {
            if (x === this.player.x && y === this.player.y) return
        }

        const slot = this.hotbar[this.selectedSlot]
        if (slot.id === null || slot.count <= 0) return

        this.world.set(x, y, slot.id)
        slot.count--
        if (slot.count <= 0) {
            slot.id = null
            slot.count = 0
        }
        this.updateHotbarUi()
    }

    // ==================== 物品栏 ====================

    // 优先放快捷栏，快捷栏满则放背包
    private addItem(id: number, count: number): void {
        count = this.stackInto(this.hotbar, id, count)
        if (count > 0) count = this.stackInto(this.backpack, id, count)
        this.updateHotbarUi()
        this.renderBackpack()
    }

    private stackInto(list: Stack[], id: number, count: number): number {
        // 先叠加到同类
        for (const slot of list) {
            if (slot.id === id && slot.count < MAX_STACK) {
                const add = Math.min(count, MAX_STACK - slot.count)
                slot.count += add
                count -= add
                if (count <= 0) return 0
            }
        }
        // 再找空位
        for (const slot of list) {
            if (slot.id === null) {
                slot.id = id
                slot.count = Math.min(count, MAX_STACK)
                count -= slot.count
                if (count <= 0) return 0
            }
        }
        return count
    }

    private updateHotbarUi(): void {
        const slots = document.querySelectorAll<HTMLElement>('.mc2d-slot')
        slots.forEach((el, idx) => {
            this.updateSlotEl(el, this.hotbar[idx])
            el.classList.toggle('is-active', idx === this.selectedSlot)
        })
    }

    private renderBackpack(): void {
        const slots = document.querySelectorAll<HTMLElement>('.mc2d-bp-slot')
        slots.forEach((el, idx) => {
            this.updateSlotEl(el, this.backpack[idx])
            el.classList.toggle('is-active', idx === this.selectedBackpackSlot)
        })
    }

    private updateSlotEl(el: HTMLElement, slot: Stack): void {
        const iconEl = el.querySelector<HTMLElement>('.mc2d-slot__icon')!
        const countEl = el.querySelector<HTMLElement>('.mc2d-slot__count')!
        if (slot.id !== null && slot.count > 0) {
            iconEl.style.background = BLOCKS[slot.id].color
            countEl.textContent = String(slot.count)
        } else {
            iconEl.style.background = 'transparent'
            countEl.textContent = ''
        }
    }

    // ==================== 背包开关 ====================

    private toggleBackpack(): void {
        if (this.gameOver) return
        this.backpackOpen = !this.backpackOpen
        this.selectedBackpackSlot = -1
        this.stopHold()

        const modal = document.getElementById('backpack-modal')!
        modal.classList.toggle('is-open', this.backpackOpen)

        if (this.backpackOpen) this.renderBackpack()
    }

    // 点击背包格子：
    // 1. 如果当前有选中格 → 交换两格
    // 2. 否则选中该格
    // 3. 若选中的是快捷栏格 → 与之交换
    private onBackpackSlotClick(idx: number): void {
        if (this.selectedBackpackSlot === -1) {
            if (this.backpack[idx].id !== null) {
                this.selectedBackpackSlot = idx
                this.renderBackpack()
            }
            return
        }

        if (this.selectedBackpackSlot === idx) {
            this.selectedBackpackSlot = -1
            this.renderBackpack()
            return
        }

        const a = this.backpack[this.selectedBackpackSlot]
        const b = this.backpack[idx]
        this.backpack[this.selectedBackpackSlot] = { id: b.id, count: b.count }
        this.backpack[idx] = { id: a.id, count: a.count }

        this.selectedBackpackSlot = -1
        this.renderBackpack()
    }

    // ==================== 生命/饥饿 ====================

    private trackMovementHunger(): void {
        this.moveCount++
        if (this.moveCount >= MOVE_HUNGER_STEP) {
            this.moveCount = 0
            this.changeHunger(-1)
        }
    }

    private changeHunger(delta: number): void {
        this.hunger = Math.max(0, Math.min(MAX_HUNGER, this.hunger + delta))
        this.updateHud()
    }

    private changeHealth(delta: number): void {
        this.health = Math.max(0, Math.min(MAX_HEALTH, this.health + delta))
        this.updateHud()
        if (this.health <= 0) {
            this.gameOver = true
            this.running = false
            this.showGameOver()
        }
    }

    private updateHud(): void {
        const healthEl = document.getElementById('health-bar')!
        const hungerEl = document.getElementById('hunger-bar')!

        healthEl.innerHTML = ''
        for (let i = 0; i < MAX_HEALTH; i++) {
            const div = document.createElement('span')
            div.className = 'mc2d-pip' + (i < this.health ? '' : ' is-empty')
            div.dataset.kind = 'health'
            healthEl.appendChild(div)
        }

        hungerEl.innerHTML = ''
        for (let i = 0; i < MAX_HUNGER; i++) {
            const div = document.createElement('span')
            div.className = 'mc2d-pip' + (i < this.hunger ? '' : ' is-empty')
            div.dataset.kind = 'hunger'
            hungerEl.appendChild(div)
        }
    }

    private showGameOver(): void {
        document.getElementById('game-over-modal')!.classList.add('is-open')
    }

    private hideGameOver(): void {
        document.getElementById('game-over-modal')!.classList.remove('is-open')
    }

    // ==================== 游戏控制 ====================

    private togglePause(): void {
        if (this.gameOver) return
        this.paused = !this.paused
        document.getElementById('pause-btn')!.textContent = this.paused ? '继续' : '暂停'
    }

    private restart(): void {
        this.hideGameOver()
        window.location.reload()
    }

    private start(): void {
        if (this.running) return
        this.running = true
        this.lastTime = performance.now()
        requestAnimationFrame(t => this.loop(t))
    }

    // ==================== 主循环 ====================

    private loop(time: number): void {
        if (!this.running) return

        const dt = Math.min(time - this.lastTime, 100)
        this.lastTime = time

        if (!this.paused && !this.backpackOpen) {
            this.update(dt, time)
        }
        this.render()

        requestAnimationFrame(t => this.loop(t))
    }

    private update(_dt: number, time: number): void {
        this.updateGravity(time)
        this.updateStarveHeal(time)
        this.updateCamera()
    }

    private updateGravity(time: number): void {
        if (time < this.jumpLockedUntil) return

        const p = this.player
        const below = p.y + 1
        const canFall = !this.world.isSolid(p.x, below)

        if (canFall) {
            p.onGround = false
            if (time - p.lastFallTime > GRAVITY_INTERVAL) {
                p.y = below
                p.lastFallTime = time
            }
        } else {
            p.onGround = true
        }
    }

    private updateStarveHeal(time: number): void {
        if (this.hunger <= 0) {
            if (time - this.lastStarveTick > STARVE_INTERVAL) {
                this.lastStarveTick = time
                this.changeHealth(-1)
            }
        } else if (this.hunger >= MAX_HUNGER) {
            if (time - this.lastHealTick > HEAL_INTERVAL) {
                this.lastHealTick = time
                if (this.health < MAX_HEALTH) this.changeHealth(1)
            }
        }
    }

    private updateCamera(): void {
        const viewCols = this.canvas.width / this.cellSize
        const viewRows = this.canvas.height / this.cellSize
        const targetX = this.player.x - viewCols / 2
        const targetY = this.player.y - viewRows / 2

        this.camera.x += (targetX - this.camera.x) * 0.15
        this.camera.y += (targetY - this.camera.y) * 0.15
    }

    private render(): void {
        this.renderer.clear()
        this.renderer.drawWorld(this.world, this.camera, this.cellSize)

        if (
            this.hoverX >= 0 &&
            this.hoverY >= 0 &&
            this.world.get(this.hoverX, this.hoverY) !== BlockId.Air
        ) {
            this.renderer.drawTargetHighlight(this.hoverX, this.hoverY, this.camera, this.cellSize)
        }

        this.renderer.drawPlayer(this.player, this.camera, this.cellSize)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MC2D()
})