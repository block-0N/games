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
import { findRecipe } from './crafting'

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

type SlotSource = 'hotbar' | 'backpack' | 'craft' | 'craftResult'

interface DragState {
    button: number
    startSource: SlotSource
    startIndex: number
    visited: Set<string>
    startedWithHeld: boolean
    placeDone: boolean
}

const BACKPACK_SIZE = 27
const CRAFT_SIZE = 9
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
    private craftGrid: Stack[] = []
    private selectedSlot = 0
    private backpackOpen = false

    private heldStack: Stack = { id: null, count: 0 }
    private dragState: DragState | null = null

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

    private mouseX = 0
    private mouseY = 0

    private heldEl!: HTMLElement
    private heldIconEl!: HTMLElement
    private heldCountEl!: HTMLElement
    private tooltipEl!: HTMLElement
    private tooltipNameEl!: HTMLElement
    private tooltipHintEl!: HTMLElement

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

        this.hotbar = this.createSlots(HOTBAR_SIZE)
        this.backpack = this.createSlots(BACKPACK_SIZE)
        this.craftGrid = this.createSlots(CRAFT_SIZE)

        this.cacheElements()
        this.init()
    }

    private createSlots(n: number): Stack[] {
        return Array.from({ length: n }, () => ({ id: null, count: 0 }))
    }

    private cacheElements(): void {
        this.heldEl = document.getElementById('held-stack')!
        this.heldIconEl = this.heldEl.querySelector('.mc2d-held__icon')!
        this.heldCountEl = this.heldEl.querySelector('.mc2d-held__count')!
        this.tooltipEl = document.getElementById('item-tooltip')!
        this.tooltipNameEl = document.getElementById('tooltip-name')!
        this.tooltipHintEl = document.getElementById('tooltip-hint')!
    }

    private init(): void {
        this.bindEvents()
        this.resize()
        this.updateHud()
        this.updateHotbarUi()
        this.renderBackpack()
        this.start()
    }

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

        document.addEventListener('mousemove', e => {
            this.mouseX = e.clientX
            this.mouseY = e.clientY
            if (this.heldStack.id !== null) {
                this.heldEl.style.left = `${e.clientX}px`
                this.heldEl.style.top = `${e.clientY}px`
            }
            if (this.tooltipEl.classList.contains('is-visible')) {
                this.tooltipEl.style.left = `${e.clientX + 14}px`
                this.tooltipEl.style.top = `${e.clientY + 14}px`
            }
        })

        document.addEventListener('mouseup', () => {
            this.stopHold()
            this.endDrag()
        })

        this.canvas.addEventListener(
            'wheel',
            e => {
                e.preventDefault()
                if (this.backpackOpen) return
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

        document.querySelectorAll<HTMLElement>('.mc2d-hotbar .mc2d-slot').forEach((el, idx) => {
            el.addEventListener('click', () => {
                this.selectedSlot = idx
                this.updateHotbarUi()
            })
        })

        const panel = document.getElementById('backpack-modal')!
        panel.addEventListener('contextmenu', e => e.preventDefault())

        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot').forEach(el => {
            const source = el.dataset.source as SlotSource
            const index = parseInt(el.dataset.index ?? '0', 10)

            el.addEventListener('mousedown', e => {
                e.preventDefault()
                e.stopPropagation()
                if (source === 'craftResult') {
                    this.onCraftResultClick()
                    return
                }
                this.onSlotMouseDown(source, index, e.button, e.shiftKey)
            })

            el.addEventListener('mouseenter', () => {
                if (source === 'craftResult') {
                    this.showCraftResultTooltip()
                    return
                }
                if (this.heldStack.id !== null) {
                    this.hideTooltip()
                    this.onSlotDragEnter(source, index)
                } else {
                    this.showTooltipFor(source, index)
                    this.onSlotDragEnter(source, index)
                }
            })

            el.addEventListener('mouseleave', () => this.hideTooltip())
        })
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (this.gameOver) return

        if (e.key === 'p' || e.key === 'P') {
            this.togglePause()
            return
        }

        if (e.key === 'e' || e.key === 'E') {
            if (this.paused) return
            this.toggleBackpack()
            e.preventDefault()
            return
        }

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
            case 'a': case 'A': case 'ArrowLeft': this.tryMove(-1, 0); break
            case 'd': case 'D': case 'ArrowRight': this.tryMove(1, 0); break
            case 'w': case 'W': case 'ArrowUp': this.tryJump(); break
            case 's': case 'S': case 'ArrowDown': this.tryMove(0, 1); break
        }

        if (beforeX !== this.player.x || beforeY !== this.player.y) this.trackMovementHunger()
        e.preventDefault()
    }

    private onKeyUp(e: KeyboardEvent): void {
        if (e.key === 'Shift') {
            if (!this.world.isSolid(this.player.x, this.player.y - 1)) this.player.sneaking = false
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
        if (button === 0) this.breakBlock(this.hoverX, this.hoverY)
        else if (button === 2) this.placeBlock(this.hoverX, this.hoverY)
    }

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

    private breakBlock(x: number, y: number): void {
        const id = this.world.get(x, y)
        if (id === BlockId.Air) return
        if (BLOCKS[id].unbreakable) return

        this.world.set(x, y, BlockId.Air)

        // 掉落物映射
        let drop = id
        if (id === BlockId.Stone) drop = BlockId.Cobble
        else if (id === BlockId.CoalOre) drop = BlockId.Coal
        else if (id === BlockId.IronOre) drop = BlockId.IronIngot
        else if (id === BlockId.GoldOre) drop = BlockId.GoldIngot
        else if (id === BlockId.DiamondOre) drop = BlockId.Diamond

        this.addItem(drop, 1)
    }

    private placeBlock(x: number, y: number): void {
        if (this.world.get(x, y) !== BlockId.Air) return

        if (!this.player.sneaking) {
            if (
                (x === this.player.x && y === this.player.y) ||
                (x === this.player.x && y === this.player.y - 1)
            ) return
        } else {
            if (x === this.player.x && y === this.player.y) return
        }

        const slot = this.hotbar[this.selectedSlot]
        if (slot.id === null || slot.count <= 0) return
        if (!BLOCKS[slot.id].placeable) return

        this.world.set(x, y, slot.id)
        slot.count--
        if (slot.count <= 0) {
            slot.id = null
            slot.count = 0
        }
        this.updateHotbarUi()
        if (this.backpackOpen) this.renderBackpack()
    }

    private addItem(id: number, count: number): void {
        count = this.stackInto(this.hotbar, id, count)
        if (count > 0) count = this.stackInto(this.backpack, id, count)
        this.updateHotbarUi()
        if (this.backpackOpen) this.renderBackpack()
    }

    private stackInto(list: Stack[], id: number, count: number): number {
        for (const slot of list) {
            if (slot.id === id && slot.count < MAX_STACK) {
                const add = Math.min(count, MAX_STACK - slot.count)
                slot.count += add
                count -= add
                if (count <= 0) return 0
            }
        }
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

    private getSlot(source: SlotSource, index: number): Stack | null {
        if (source === 'hotbar') return this.hotbar[index]
        if (source === 'backpack') return this.backpack[index]
        if (source === 'craft') return this.craftGrid[index]
        return null
    }

    // ==================== UI 渲染 ====================

    private updateHotbarUi(): void {
        document.querySelectorAll<HTMLElement>('.mc2d-hotbar .mc2d-slot').forEach((el, idx) => {
            this.updateSlotEl(el, this.hotbar[idx])
            el.classList.toggle('is-active', idx === this.selectedSlot)
        })
    }

    private renderBackpack(): void {
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot[data-source="backpack"]').forEach((el, idx) => {
            this.updateSlotEl(el, this.backpack[idx])
        })
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot[data-source="hotbar"]').forEach((el, idx) => {
            this.updateSlotEl(el, this.hotbar[idx])
        })
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot[data-source="craft"]').forEach((el, idx) => {
            this.updateSlotEl(el, this.craftGrid[idx])
        })

        // 结果格
        const resultEl = document.getElementById('craft-result')!
        const result = this.computeCraftResult()
        if (result) {
            this.updateSlotEl(resultEl, result)
        } else {
            this.updateSlotEl(resultEl, { id: null, count: 0 })
        }

        this.drawPlayerModel()
        document.getElementById('bp-health')!.textContent = String(this.health)
        document.getElementById('bp-hunger')!.textContent = String(this.hunger)
        this.renderHeld()
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

    private renderHeld(): void {
        if (this.heldStack.id !== null && this.heldStack.count > 0) {
            this.heldEl.classList.add('is-visible')
            this.heldIconEl.style.background = BLOCKS[this.heldStack.id].color
            this.heldCountEl.textContent = String(this.heldStack.count)
            this.heldEl.style.left = `${this.mouseX}px`
            this.heldEl.style.top = `${this.mouseY}px`
        } else {
            this.heldEl.classList.remove('is-visible')
            this.heldCountEl.textContent = ''
        }
    }

    private syncBothUis(): void {
        this.updateHotbarUi()
        this.renderBackpack()
    }

    // ==================== 合成 ====================

    private computeCraftResult(): Stack | null {
        const grid = this.craftGrid.map(s => s.id)
        const found = findRecipe(grid)
        if (!found) return null
        return { id: found.recipe.result.id, count: found.recipe.result.count }
    }

    private onCraftResultClick(): void {
        const found = findRecipe(this.craftGrid.map(s => s.id))
        if (!found) return

        // 消耗
        for (const idx of found.consume) {
            const s = this.craftGrid[idx]
            s.count--
            if (s.count <= 0) {
                s.id = null
                s.count = 0
            }
        }

        // 产出
        let rest = this.stackInto(this.backpack, found.recipe.result.id, found.recipe.result.count)
        if (rest > 0) rest = this.stackInto(this.hotbar, found.recipe.result.id, rest)

        this.syncBothUis()
    }

    private showCraftResultTooltip(): void {
        const result = this.computeCraftResult()
        if (!result || result.id === null) {
            this.hideTooltip()
            return
        }
        const def = BLOCKS[result.id]
        this.tooltipNameEl.textContent = def.name
        this.tooltipHintEl.textContent = `点击合成 · 数量 ${result.count}`
        this.tooltipEl.classList.add('is-visible')
        this.tooltipEl.style.left = `${this.mouseX + 14}px`
        this.tooltipEl.style.top = `${this.mouseY + 14}px`
    }

    // ==================== 背包开关 ====================

    private toggleBackpack(): void {
        if (this.gameOver) return
        this.backpackOpen = !this.backpackOpen
        this.stopHold()
        this.dragState = null
        this.hideTooltip()

        if (!this.backpackOpen) {
            // 关背包时把手上 + 合成格物品归还
            if (this.heldStack.id !== null) this.returnHeldToInventory()
            this.returnCraftGridToInventory()
        }

        const modal = document.getElementById('backpack-modal')!
        modal.classList.toggle('is-open', this.backpackOpen)

        if (this.backpackOpen) this.renderBackpack()
        else this.renderHeld()
    }

    private returnHeldToInventory(): void {
        const id = this.heldStack.id
        const count = this.heldStack.count
        if (id === null) return
        let rest = this.stackInto(this.backpack, id, count)
        if (rest > 0) rest = this.stackInto(this.hotbar, id, rest)
        this.heldStack = { id: null, count: 0 }
    }

    private returnCraftGridToInventory(): void {
        for (const slot of this.craftGrid) {
            if (slot.id === null || slot.count <= 0) continue
            let rest = this.stackInto(this.backpack, slot.id, slot.count)
            if (rest > 0) rest = this.stackInto(this.hotbar, slot.id, rest)
            slot.id = null
            slot.count = 0
        }
    }

    // ==================== Minecraft 交互 ====================

    private onSlotMouseDown(source: SlotSource, index: number, button: number, shift: boolean): void {
        if (shift) {
            this.quickMove(source, index)
            return
        }

        const key = `${source}:${index}`
        const slot = this.getSlot(source, index)
        if (!slot) return
        const held = this.heldStack

        this.dragState = {
            button,
            startSource: source,
            startIndex: index,
            visited: new Set([key]),
            startedWithHeld: held.id !== null,
            placeDone: false
        }

        if ((button === 0 || button === 2) && held.id !== null && held.count > 0) {
            if (slot.id === null || slot.id === held.id) {
                if (this.tryPlaceOne(slot, held)) {
                    this.dragState.placeDone = true
                    this.syncBothUis()
                }
            }
        }
    }

    private onSlotDragEnter(source: SlotSource, index: number): void {
        if (!this.dragState) return
        const key = `${source}:${index}`
        if (this.dragState.visited.has(key)) return
        this.dragState.visited.add(key)

        const held = this.heldStack
        if (held.id === null || held.count <= 0) return

        const slot = this.getSlot(source, index)
        if (!slot) return
        if (slot.id !== null && slot.id !== held.id) return
        if (slot.id === held.id && slot.count >= MAX_STACK) return

        if (this.tryPlaceOne(slot, held)) this.syncBothUis()
    }

    private endDrag(): void {
        if (!this.dragState) return
        const drag = this.dragState
        this.dragState = null

        if (drag.visited.size !== 1) return

        if (drag.button === 0) {
            this.leftClick(drag.startSource, drag.startIndex)
        } else if (drag.button === 2) {
            if (!drag.startedWithHeld || !drag.placeDone) {
                this.rightClick(drag.startSource, drag.startIndex)
            }
        }
    }

    private tryPlaceOne(slot: Stack, held: Stack): boolean {
        if (held.id === null || held.count <= 0) return false
        if (slot.id === null) {
            slot.id = held.id
            slot.count = 1
        } else if (slot.id === held.id && slot.count < MAX_STACK) {
            slot.count++
        } else return false

        held.count--
        if (held.count <= 0) this.heldStack = { id: null, count: 0 }
        return true
    }

    private leftClick(source: SlotSource, index: number): void {
        const slot = this.getSlot(source, index)
        if (!slot) return
        const held = this.heldStack

        if (held.id === null) {
            if (slot.id !== null && slot.count > 0) {
                this.heldStack = { id: slot.id, count: slot.count }
                slot.id = null
                slot.count = 0
            }
        } else {
            if (slot.id === null) {
                slot.id = held.id
                slot.count = held.count
                this.heldStack = { id: null, count: 0 }
            } else if (slot.id === held.id) {
                const add = Math.min(held.count, MAX_STACK - slot.count)
                slot.count += add
                held.count -= add
                if (held.count <= 0) this.heldStack = { id: null, count: 0 }
            } else {
                const tmp = { id: slot.id, count: slot.count }
                slot.id = held.id
                slot.count = held.count
                this.heldStack = tmp
            }
        }
        this.syncBothUis()
    }

    private rightClick(source: SlotSource, index: number): void {
        const slot = this.getSlot(source, index)
        if (!slot) return
        const held = this.heldStack

        if (held.id === null) {
            if (slot.id !== null && slot.count > 0) {
                const half = Math.ceil(slot.count / 2)
                this.heldStack = { id: slot.id, count: half }
                slot.count -= half
                if (slot.count <= 0) {
                    slot.id = null
                    slot.count = 0
                }
            }
        } else {
            if (slot.id === null) {
                slot.id = held.id
                slot.count = 1
                held.count--
            } else if (slot.id === held.id && slot.count < MAX_STACK) {
                slot.count++
                held.count--
            } else return
            if (held.count <= 0) this.heldStack = { id: null, count: 0 }
        }
        this.syncBothUis()
    }

    private quickMove(source: SlotSource, index: number): void {
        const slot = this.getSlot(source, index)
        if (!slot || slot.id === null || slot.count <= 0) return

        const target =
            source === 'hotbar' ? this.backpack : this.hotbar

        const remaining = this.stackInto(target, slot.id, slot.count)
        if (remaining === 0) {
            slot.id = null
            slot.count = 0
        } else if (remaining < slot.count) {
            slot.count = remaining
        }
        this.syncBothUis()
    }

    private showTooltipFor(source: SlotSource, index: number): void {
        const slot = this.getSlot(source, index)
        if (!slot || slot.id === null || slot.count <= 0) {
            this.hideTooltip()
            return
        }
        const def = BLOCKS[slot.id]
        this.tooltipNameEl.textContent = def.name
        const tips: string[] = [`数量 ${slot.count}`]
        if (def.unbreakable) tips.push('无法破坏')
        if (def.food) tips.push(`食用回复 ${def.food} 饥饿`)
        if (def.toolLevel) tips.push(`工具等级 ${def.toolLevel}`)
        if (!def.placeable && !def.food) tips.push('不可放置')
        this.tooltipHintEl.textContent = tips.join(' · ')
        this.tooltipEl.classList.add('is-visible')
        this.tooltipEl.style.left = `${this.mouseX + 14}px`
        this.tooltipEl.style.top = `${this.mouseY + 14}px`
    }

    private hideTooltip(): void {
        this.tooltipEl.classList.remove('is-visible')
    }

    // ==================== 人物模型 ====================

    private drawPlayerModel(): void {
        const canvas = document.getElementById('player-model') as HTMLCanvasElement | null
        if (!canvas) return
        const ctx = canvas.getContext('2d')!
        const W = canvas.width
        const H = canvas.height

        ctx.clearRect(0, 0, W, H)
        ctx.fillStyle = 'rgba(0,0,0,0.08)'
        ctx.fillRect(0, H - 12, W, 12)

        const px = 16
        const headW = px * 4
        const headH = px * 4
        const bodyW = px * 4
        const bodyH = px * 5
        const legH = px * 2
        const armW = px * 1

        const totalH = headH + bodyH + legH
        const startY = Math.floor((H - totalH) / 2) + 6
        const centerX = Math.floor(W / 2)
        const headX = centerX - headW / 2
        const bodyX = centerX - bodyW / 2

        ctx.fillStyle = '#ffd5b5'
        ctx.fillRect(headX, startY, headW, headH)
        ctx.fillStyle = '#6b4226'
        ctx.fillRect(headX, startY, headW, px * 1.4)
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(headX + px * 0.9, startY + px * 1.9, px * 0.55, px * 0.7)
        ctx.fillRect(headX + px * 2.55, startY + px * 1.9, px * 0.55, px * 0.7)
        ctx.fillStyle = '#b8826a'
        ctx.fillRect(headX + px * 1.5, startY + px * 3.1, px * 1, px * 0.4)

        const bodyY = startY + headH
        ctx.fillStyle = '#3498db'
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH)
        ctx.fillStyle = '#2b7fc1'
        ctx.fillRect(bodyX - armW, bodyY, armW, bodyH - px)
        ctx.fillRect(bodyX + bodyW, bodyY, armW, bodyH - px)
        ctx.fillStyle = '#ffd5b5'
        ctx.fillRect(bodyX - armW, bodyY + bodyH - px, armW, px)
        ctx.fillRect(bodyX + bodyW, bodyY + bodyH - px, armW, px)

        const legY = bodyY + bodyH
        ctx.fillStyle = '#2c3e50'
        const legW = bodyW / 2 - 1
        ctx.fillRect(bodyX, legY, legW, legH)
        ctx.fillRect(bodyX + bodyW - legW, legY, legW, legH)
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(bodyX, legY + legH - 4, legW, 4)
        ctx.fillRect(bodyX + bodyW - legW, legY + legH - 4, legW, 4)
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
        if (this.backpackOpen) {
            document.getElementById('bp-hunger')!.textContent = String(this.hunger)
        }
    }

    private changeHealth(delta: number): void {
        this.health = Math.max(0, Math.min(MAX_HEALTH, this.health + delta))
        this.updateHud()
        if (this.backpackOpen) {
            document.getElementById('bp-health')!.textContent = String(this.health)
        }
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

    private loop(time: number): void {
        if (!this.running) return
        const dt = Math.min(time - this.lastTime, 100)
        this.lastTime = time
        if (!this.paused && !this.backpackOpen) this.update(dt, time)
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