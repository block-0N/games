import '../../styles/theme.css'
import './style.css'
import { World } from './world'
import { Renderer } from './renderer'
import { loadAllTextures, getTextureUrl } from './textures'
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
    HEAL_INTERVAL,
    FALL_SAFE_DISTANCE,
    FURNACE_SMELT_MS,
    TOOL_MULTIPLIER
} from './constants'
import { findRecipe2x2, findRecipe3x3 } from './crafting'
import { findSmelt } from './smelting'
import type { LightSource } from './renderer'

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

interface FurnaceState {
    input: Stack
    fuel: Stack
    output: Stack
    burnTimeLeft: number
    burnTimeMax: number
    smeltProgress: number
}

type SlotSource =
    | 'hotbar'
    | 'backpack'
    | 'craft'
    | 'craftResult'
    | 'furnaceInput'
    | 'furnaceFuel'
    | 'furnaceOutput'

type UiMode = 'none' | 'backpack' | 'workbench' | 'furnace'

const BACKPACK_SIZE = 27

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
    private uiMode: UiMode = 'none'
    private craftSize = 4  // 4=2x2, 9=3x3
    private currentFurnaceKey: string | null = null
    private furnaces = new Map<string, FurnaceState>()

    private selectedSlot = 0

    private heldStack: Stack = { id: null, count: 0 }
    private dragState: {
        button: number
        startSource: SlotSource
        startIndex: number
        visited: Set<string>
        startedWithHeld: boolean
        placeDone: boolean
    } | null = null

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
    private mouseX = 0
    private mouseY = 0

    // 挖掘进度
    private miningX = -1
    private miningY = -1
    private miningProgress = 0
    private miningTotal = 0

    private lightSources: LightSource[] = []
    private lightsDirty = true

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
        this.craftGrid = this.createSlots(4)

        this.cacheElements()
        this.buildBackpackGridDom()
        this.buildCraftGridDom()

        loadAllTextures().then(() => {
            this.init()
        })
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

    private buildBackpackGridDom(): void {
        const bpGrid = document.getElementById('backpack-grid')!
        bpGrid.innerHTML = ''
        for (let i = 0; i < BACKPACK_SIZE; i++) {
            bpGrid.appendChild(this.makeSlotEl('backpack', i))
        }

        const hbGrid = document.getElementById('backpack-hotbar')!
        hbGrid.innerHTML = ''
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            hbGrid.appendChild(this.makeSlotEl('hotbar', i, String(i + 1)))
        }

        const fBp = document.getElementById('furnace-backpack-grid')!
        fBp.innerHTML = ''
        for (let i = 0; i < BACKPACK_SIZE; i++) {
            fBp.appendChild(this.makeSlotEl('backpack', i))
        }
        const fHb = document.getElementById('furnace-hotbar')!
        fHb.innerHTML = ''
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            fHb.appendChild(this.makeSlotEl('hotbar', i, String(i + 1)))
        }
    }

    private makeSlotEl(source: SlotSource, index: number, key?: string): HTMLElement {
        const el = document.createElement('div')
        el.className = 'mc2d-bp-slot'
        el.dataset.source = source
        el.dataset.index = String(index)
        if (key) {
            const k = document.createElement('span')
            k.className = 'mc2d-slot__key'
            k.textContent = key
            el.appendChild(k)
        }
        const icon = document.createElement('span')
        icon.className = 'mc2d-slot__icon'
        el.appendChild(icon)
        const count = document.createElement('span')
        count.className = 'mc2d-slot__count'
        el.appendChild(count)
        return el
    }

    private buildCraftGridDom(): void {
        const grid = document.getElementById('craft-grid')!
        grid.innerHTML = ''
        grid.className = 'mc2d-craft__grid ' + (this.craftSize === 4 ? 'mc2d-craft__grid--2x2' : 'mc2d-craft__grid--3x3')
        for (let i = 0; i < this.craftSize; i++) {
            grid.appendChild(this.makeSlotEl('craft', i))
        }
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

        document.addEventListener('mouseup', () => this.endDrag())

        this.canvas.addEventListener(
            'wheel',
            e => {
                e.preventDefault()
                if (this.uiMode !== 'none') return
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
        document.getElementById('backpack-close')!.addEventListener('click', () => this.closeUi())
        document.getElementById('furnace-close')!.addEventListener('click', () => this.closeUi())

        document.querySelectorAll<HTMLElement>('.mc2d-hotbar .mc2d-slot').forEach((el, idx) => {
            el.addEventListener('click', () => {
                this.selectedSlot = idx
                this.updateHotbarUi()
            })
        })

        document.querySelectorAll('.mc2d-backpack, .mc2d-furnace').forEach(panel => {
            panel.addEventListener('contextmenu', e => e.preventDefault())
        })

        // 事件委托，动态绑定所有格子
        document.addEventListener('mousedown', e => {
            const el = (e.target as HTMLElement).closest('.mc2d-bp-slot') as HTMLElement | null
            if (!el) return
            const source = el.dataset.source as SlotSource | undefined
            if (!source) return
            const index = parseInt(el.dataset.index ?? '0', 10)

            e.preventDefault()
            e.stopPropagation()

            if (source === 'craftResult') {
                this.onCraftResultClick()
                return
            }
            if (source === 'furnaceOutput') {
                this.onFurnaceOutputClick()
                return
            }
            this.onSlotMouseDown(source, index, (e as MouseEvent).button, (e as MouseEvent).shiftKey)
        })

        document.addEventListener('mouseenter', e => {
            const el = (e.target as HTMLElement).closest?.('.mc2d-bp-slot') as HTMLElement | null
            if (!el) return
            const source = el.dataset.source as SlotSource | undefined
            if (!source) return
            const index = parseInt(el.dataset.index ?? '0', 10)

            if (source === 'craftResult') {
                this.showCraftResultTooltip()
                return
            }
            if (source === 'furnaceOutput') {
                this.showFurnaceOutputTooltip()
                return
            }
            if (this.heldStack.id !== null) {
                this.hideTooltip()
                this.onSlotDragEnter(source, index)
            } else {
                this.showTooltipFor(source, index)
                this.onSlotDragEnter(source, index)
            }
        }, true)

        document.addEventListener('mouseleave', e => {
            const el = (e.target as HTMLElement).closest?.('.mc2d-bp-slot')
            if (el) this.hideTooltip()
        }, true)
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (this.gameOver) return

        if (e.key === 'p' || e.key === 'P') {
            this.togglePause()
            return
        }

        if (e.key === 'e' || e.key === 'E') {
            if (this.paused) return
            if (this.uiMode === 'backpack' || this.uiMode === 'workbench') this.closeUi()
            else this.toggleBackpack()
            e.preventDefault()
            return
        }

        if (e.key === 'Escape' && this.uiMode !== 'none') {
            this.closeUi()
            return
        }

        if (this.paused || this.uiMode !== 'none') return

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
        if (!this.running || this.paused || this.gameOver) return
        if (this.uiMode !== 'none') return
        if (this.hoverX < 0 || this.hoverY < 0) return

        this.mouseDownButton = e.button

        if (e.button === 0) {
            // 左键开始挖
            this.startMining(this.hoverX, this.hoverY)
        } else if (e.button === 2) {
            // 右键：交互/放置
            this.onRightClick()
        }
    }

    private onRightClick(): void {
        const x = this.hoverX
        const y = this.hoverY
        const blockId = this.world.get(x, y)

        // 优先：与方块交互
        if (blockId === BlockId.CraftingTable) {
            this.openWorkbench()
            return
        }
        if (blockId === BlockId.Furnace) {
            this.openFurnace(x, y)
            return
        }

        // 其次：吃食物
        const slot = this.hotbar[this.selectedSlot]
        if (slot.id !== null && BLOCKS[slot.id].food) {
            this.eatFood(slot)
            return
        }

        // 再次：放置方块
        this.placeBlock(x, y)
    }

    private eatFood(slot: Stack): void {
        if (slot.id === null) return
        const def = BLOCKS[slot.id]
        if (!def.food) return
        if (this.hunger >= MAX_HUNGER) return

        this.changeHunger(def.food)
        slot.count--
        if (slot.count <= 0) {
            slot.id = null
            slot.count = 0
        }
        this.updateHotbarUi()
    }

    // ==================== 挖掘 ====================

    private startMining(x: number, y: number): void {
        const id = this.world.get(x, y)
        if (id === BlockId.Air) return
        if (BLOCKS[id].unbreakable) return

        const def = BLOCKS[id]
        const tool = this.getCurrentToolLevel()

        if (def.breakMinLevel && tool < def.breakMinLevel) {
            return
        }

        const baseTime = def.breakTime ?? 500
        const mult = TOOL_MULTIPLIER[tool] ?? 1
        this.miningTotal = baseTime / mult
        this.miningProgress = 0
        this.miningX = x
        this.miningY = y
    }

    private updateMining(dt: number): void {
        if (this.miningX < 0 || this.miningY < 0) return
        if (this.mouseDownButton !== 0) {
            this.resetMining()
            return
        }

        const id = this.world.get(this.miningX, this.miningY)
        if (id === BlockId.Air) {
            this.resetMining()
            return
        }

        this.miningProgress += dt
        if (this.miningProgress >= this.miningTotal) {
            this.breakBlock(this.miningX, this.miningY)
            this.resetMining()
        }
    }

    private resetMining(): void {
        this.miningX = -1
        this.miningY = -1
        this.miningProgress = 0
        this.miningTotal = 0
    }

    private getCurrentToolLevel(): number {
        const slot = this.hotbar[this.selectedSlot]
        if (slot.id === null) return 0
        return BLOCKS[slot.id].toolLevel ?? 0
    }

    private breakBlock(x: number, y: number): void {
        const id = this.world.get(x, y)
        if (id === BlockId.Air) return
        if (BLOCKS[id].unbreakable) return

        this.world.set(x, y, BlockId.Air)
        this.lightsDirty = true

        const def = BLOCKS[id]
        const dropId = def.drops ?? id
        const chance = def.dropChance ?? 1
        if (Math.random() <= chance) {
            this.addItem(dropId, 1)
        }
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
        this.lightsDirty = true
        slot.count--
        if (slot.count <= 0) {
            slot.id = null
            slot.count = 0
        }
        this.updateHotbarUi()
        if (this.uiMode !== 'none') this.renderBackpack()
    }

    // ==================== 玩家移动 ====================

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

    private addItem(id: number, count: number): void {
        count = this.stackInto(this.hotbar, id, count)
        if (count > 0) count = this.stackInto(this.backpack, id, count)
        this.updateHotbarUi()
        if (this.uiMode !== 'none') this.renderBackpack()
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
        if (source === 'furnaceInput' || source === 'furnaceFuel' || source === 'furnaceOutput') {
            const f = this.getCurrentFurnace()
            if (!f) return null
            if (source === 'furnaceInput') return f.input
            if (source === 'furnaceFuel') return f.fuel
            return f.output
        }
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
        if (this.uiMode === 'none') {
            this.renderHeld()
            return
        }

        // 所有 backpack / hotbar 格
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot[data-source="backpack"]').forEach(el => {
            const idx = parseInt(el.dataset.index ?? '0', 10)
            this.updateSlotEl(el, this.backpack[idx])
        })
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot[data-source="hotbar"]').forEach(el => {
            const idx = parseInt(el.dataset.index ?? '0', 10)
            this.updateSlotEl(el, this.hotbar[idx])
        })
        document.querySelectorAll<HTMLElement>('.mc2d-bp-slot[data-source="craft"]').forEach(el => {
            const idx = parseInt(el.dataset.index ?? '0', 10)
            this.updateSlotEl(el, this.craftGrid[idx])
        })

        // 合成结果格
        const resultEl = document.getElementById('craft-result')
        if (resultEl) {
            const result = this.computeCraftResult()
            this.updateSlotEl(resultEl, result ?? { id: null, count: 0 })
        }

        // 熔炉格
        const f = this.getCurrentFurnace()
        if (f) {
            const inEl = document.querySelector<HTMLElement>('.mc2d-bp-slot[data-source="furnaceInput"]')
            const fuelEl = document.querySelector<HTMLElement>('.mc2d-bp-slot[data-source="furnaceFuel"]')
            const outEl = document.querySelector<HTMLElement>('.mc2d-bp-slot[data-source="furnaceOutput"]')
            if (inEl) this.updateSlotEl(inEl, f.input)
            if (fuelEl) this.updateSlotEl(fuelEl, f.fuel)
            if (outEl) this.updateSlotEl(outEl, f.output)
        }

        this.drawPlayerModel()
        const hEl = document.getElementById('bp-health')
        const huEl = document.getElementById('bp-hunger')
        if (hEl) hEl.textContent = String(this.health)
        if (huEl) huEl.textContent = String(this.hunger)

        this.renderHeld()
    }

    private updateSlotEl(el: HTMLElement, slot: Stack): void {
        const iconEl = el.querySelector<HTMLElement>('.mc2d-slot__icon')!
        const countEl = el.querySelector<HTMLElement>('.mc2d-slot__count')!

        if (slot.id !== null && slot.count > 0) {
            const url = getTextureUrl(slot.id)
            if (url) {
                iconEl.style.backgroundImage = `url("${url}")`
                iconEl.style.backgroundSize = 'contain'
                iconEl.style.backgroundRepeat = 'no-repeat'
                iconEl.style.backgroundPosition = 'center'
                iconEl.style.backgroundColor = 'transparent'
            } else {
                iconEl.style.backgroundImage = 'none'
                iconEl.style.backgroundColor = BLOCKS[slot.id].color
            }
            countEl.textContent = String(slot.count)
        } else {
            iconEl.style.backgroundImage = 'none'
            iconEl.style.backgroundColor = 'transparent'
            countEl.textContent = ''
        }
    }

    private renderHeld(): void {
        if (this.heldStack.id !== null && this.heldStack.count > 0) {
            this.heldEl.classList.add('is-visible')
            const url = getTextureUrl(this.heldStack.id)
            if (url) {
                this.heldIconEl.style.backgroundImage = `url("${url}")`
                this.heldIconEl.style.backgroundSize = 'contain'
                this.heldIconEl.style.backgroundRepeat = 'no-repeat'
                this.heldIconEl.style.backgroundPosition = 'center'
                this.heldIconEl.style.backgroundColor = 'transparent'
            } else {
                this.heldIconEl.style.backgroundImage = 'none'
                this.heldIconEl.style.backgroundColor = BLOCKS[this.heldStack.id].color
            }
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
        const found = this.craftSize === 4 ? findRecipe2x2(grid) : findRecipe3x3(grid)
        if (!found) return null
        return { id: found.recipe.result.id, count: found.recipe.result.count }
    }

    private onCraftResultClick(): void {
        const grid = this.craftGrid.map(s => s.id)
        const found = this.craftSize === 4 ? findRecipe2x2(grid) : findRecipe3x3(grid)
        if (!found) return

        for (const idx of found.consume) {
            const s = this.craftGrid[idx]
            s.count--
            if (s.count <= 0) {
                s.id = null
                s.count = 0
            }
        }

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

    // ==================== 熔炉 ====================

    private getCurrentFurnace(): FurnaceState | null {
        if (!this.currentFurnaceKey) return null
        let f = this.furnaces.get(this.currentFurnaceKey)
        if (!f) {
            f = {
                input: { id: null, count: 0 },
                fuel: { id: null, count: 0 },
                output: { id: null, count: 0 },
                burnTimeLeft: 0,
                burnTimeMax: 0,
                smeltProgress: 0
            }
            this.furnaces.set(this.currentFurnaceKey, f)
        }
        return f
    }

    private openFurnace(x: number, y: number): void {
        this.currentFurnaceKey = `${x},${y}`
        this.uiMode = 'furnace'
        this.openUiPanel('furnace-modal')
        this.renderBackpack()
    }

    private tickFurnaces(dt: number): void {
        for (const f of this.furnaces.values()) {
            this.tickFurnace(f, dt)
        }
        // 更新熔炉 UI
        if (this.uiMode === 'furnace') {
            const f = this.getCurrentFurnace()
            if (f) {
                const bar = document.getElementById('furnace-progress')
                const fire = document.querySelector('.mc2d-furnace__fire')
                if (bar) bar.style.width = `${(f.smeltProgress / FURNACE_SMELT_MS) * 100}%`
                if (fire) fire.classList.toggle('is-active', f.burnTimeLeft > 0)
                const inEl = document.querySelector<HTMLElement>('.mc2d-bp-slot[data-source="furnaceInput"]')
                const fuelEl = document.querySelector<HTMLElement>('.mc2d-bp-slot[data-source="furnaceFuel"]')
                const outEl = document.querySelector<HTMLElement>('.mc2d-bp-slot[data-source="furnaceOutput"]')
                if (inEl) this.updateSlotEl(inEl, f.input)
                if (fuelEl) this.updateSlotEl(fuelEl, f.fuel)
                if (outEl) this.updateSlotEl(outEl, f.output)
            }
        }
    }

    private tickFurnace(f: FurnaceState, dt: number): void {
        const smelt = findSmelt(f.input.id)

        const canOutput =
            smelt !== null &&
            f.input.count > 0 &&
            (f.output.id === null || (f.output.id === smelt.output && f.output.count < MAX_STACK))

        // 消耗燃料
        if (f.burnTimeLeft <= 0 && canOutput && f.fuel.id !== null && f.fuel.count > 0) {
            const fuelDef = BLOCKS[f.fuel.id]
            if (fuelDef.fuel) {
                f.burnTimeLeft = fuelDef.fuel * 1000
                f.burnTimeMax = f.burnTimeLeft
                f.fuel.count--
                if (f.fuel.count <= 0) {
                    f.fuel.id = null
                    f.fuel.count = 0
                }
            }
        }

        if (f.burnTimeLeft > 0) {
            f.burnTimeLeft -= dt
            if (f.burnTimeLeft < 0) f.burnTimeLeft = 0
        }

        if (canOutput && f.burnTimeLeft > 0) {
            f.smeltProgress += dt
            if (f.smeltProgress >= FURNACE_SMELT_MS) {
                f.smeltProgress = 0
                if (f.output.id === null) {
                    f.output.id = smelt!.output
                    f.output.count = smelt!.count
                } else {
                    f.output.count += smelt!.count
                }
                f.input.count--
                if (f.input.count <= 0) {
                    f.input.id = null
                    f.input.count = 0
                }
            }
        } else {
            f.smeltProgress = 0
        }
    }

    private onFurnaceOutputClick(): void {
        const f = this.getCurrentFurnace()
        if (!f || f.output.id === null) return
        let rest = this.stackInto(this.backpack, f.output.id, f.output.count)
        if (rest > 0) rest = this.stackInto(this.hotbar, f.output.id, rest)
        f.output.id = null
        f.output.count = 0
        this.syncBothUis()
    }

    private showFurnaceOutputTooltip(): void {
        const f = this.getCurrentFurnace()
        if (!f || f.output.id === null) {
            this.hideTooltip()
            return
        }
        this.tooltipNameEl.textContent = BLOCKS[f.output.id].name
        this.tooltipHintEl.textContent = `点击取出 · 数量 ${f.output.count}`
        this.tooltipEl.classList.add('is-visible')
        this.tooltipEl.style.left = `${this.mouseX + 14}px`
        this.tooltipEl.style.top = `${this.mouseY + 14}px`
    }

    // ==================== UI 控制 ====================

    private openUiPanel(id: string): void {
        document.getElementById(id)!.classList.add('is-open')
    }

    private toggleBackpack(): void {
        if (this.gameOver) return
        if (this.uiMode === 'backpack') {
            this.closeUi()
            return
        }
        this.setCraftSize(4)
        this.uiMode = 'backpack'
        const title = document.getElementById('backpack-title')
        if (title) title.textContent = '背包'
        const label = document.getElementById('craft-label')
        if (label) label.textContent = '合成（2×2）'
        this.openUiPanel('backpack-modal')
        this.renderBackpack()
    }

    private openWorkbench(): void {
        if (this.gameOver) return
        this.setCraftSize(9)
        this.uiMode = 'workbench'
        const title = document.getElementById('backpack-title')
        if (title) title.textContent = '工作台'
        const label = document.getElementById('craft-label')
        if (label) label.textContent = '合成（3×3）'
        this.openUiPanel('backpack-modal')
        this.renderBackpack()
    }

    private setCraftSize(size: number): void {
        if (this.craftSize === size) return
        // 把现有材料返回背包
        for (const slot of this.craftGrid) {
            if (slot.id !== null && slot.count > 0) {
                let rest = this.stackInto(this.backpack, slot.id, slot.count)
                if (rest > 0) rest = this.stackInto(this.hotbar, slot.id, rest)
                slot.id = null
                slot.count = 0
            }
        }
        this.craftSize = size
        this.craftGrid = this.createSlots(size)
        this.buildCraftGridDom()
    }

    private closeUi(): void {
        const wasMode = this.uiMode
        this.uiMode = 'none'
        this.currentFurnaceKey = null

        document.getElementById('backpack-modal')?.classList.remove('is-open')
        document.getElementById('furnace-modal')?.classList.remove('is-open')

        if (this.heldStack.id !== null) this.returnHeldToInventory()

        // 关闭合成格时把物品返回背包
        for (const slot of this.craftGrid) {
            if (slot.id !== null && slot.count > 0) {
                let rest = this.stackInto(this.backpack, slot.id, slot.count)
                if (rest > 0) rest = this.stackInto(this.hotbar, slot.id, rest)
                slot.id = null
                slot.count = 0
            }
        }

        // 如果是工作台，合成格从 9 变回 4
        if (wasMode === 'workbench') {
            this.craftSize = 4
            this.craftGrid = this.createSlots(4)
            this.buildCraftGridDom()
        }

        this.hideTooltip()
        this.renderHeld()
    }

    private returnHeldToInventory(): void {
        const id = this.heldStack.id
        const count = this.heldStack.count
        if (id === null) return
        let rest = this.stackInto(this.backpack, id, count)
        if (rest > 0) rest = this.stackInto(this.hotbar, id, rest)
        this.heldStack = { id: null, count: 0 }
    }

    // ==================== 交互（物品栏） ====================

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

        let target: Stack[]
        if (source === 'hotbar') target = this.backpack
        else if (source === 'backpack') target = this.hotbar
        else target = this.backpack

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
        if (def.food) tips.push(`食用回复 ${def.food} 饥饿`)
        if (def.toolLevel) tips.push(`镐等级 ${def.toolLevel}`)
        if (def.fuel) tips.push(`可作燃料`)
        if (!def.placeable && !def.food && !def.toolLevel && !def.fuel) tips.push('材料')
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
        if (this.uiMode !== 'none') {
            const el = document.getElementById('bp-hunger')
            if (el) el.textContent = String(this.hunger)
        }
    }

    private changeHealth(delta: number): void {
        this.health = Math.max(0, Math.min(MAX_HEALTH, this.health + delta))
        this.updateHud()
        if (this.uiMode !== 'none') {
            const el = document.getElementById('bp-health')
            if (el) el.textContent = String(this.health)
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

        if (!this.paused && this.uiMode === 'none') {
            this.update(dt, time)
        }
        // 熔炉在任何 UI 下都继续运行（real time）
        this.tickFurnaces(dt)

        this.render()
        requestAnimationFrame(t => this.loop(t))
    }

    private update(dt: number, time: number): void {
        this.updateGravity(time)
        this.updateStarveHeal(time)
        this.updateCamera()
        this.updateMining(dt)
    }

    private updateGravity(time: number): void {
        if (time < this.jumpLockedUntil) return

        const p = this.player
        const below = p.y + 1
        const canFall = !this.world.isSolid(p.x, below)

        if (canFall) {
            if (p.onGround) {
                // 刚离开地面，记录起点
                p.lastFallTime = time
                // 用 lastFallTime 当作落地高度标记的起点，暂存在 sneaking 无关变量
                // 这里用跳转标志简化：记录 fellFrom
                this.fellFrom = p.y
            }
            p.onGround = false
            if (time - p.lastFallTime > GRAVITY_INTERVAL) {
                p.y = below
                p.lastFallTime = time
            }
        } else {
            if (!p.onGround && this.fellFrom >= 0) {
                const fallDist = p.y - this.fellFrom
                if (fallDist > FALL_SAFE_DISTANCE) {
                    const dmg = Math.floor(fallDist - FALL_SAFE_DISTANCE)
                    if (dmg > 0) this.changeHealth(-dmg)
                }
                this.fellFrom = -1
            }
            p.onGround = true
        }
    }

    private fellFrom = -1

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

    private refreshLights(): void {
        this.lightSources = []
        // 简化：扫描玩家周围 60 格范围
        const px = Math.floor(this.player.x)
        const py = Math.floor(this.player.y)
        const range = 40
        for (let y = py - range; y <= py + range; y++) {
            for (let x = px - range; x <= px + range; x++) {
                const id = this.world.get(x, y)
                if (id === BlockId.Torch) {
                    this.lightSources.push({ x, y, radius: BLOCKS[id].lightRadius ?? 0 })
                }
            }
        }
        this.lightsDirty = false
    }

    private render(): void {
        this.renderer.clear()
        this.renderer.drawWorld(this.world, this.camera, this.cellSize)

        if (this.lightsDirty) this.refreshLights()
        this.renderer.drawLights(this.lightSources, this.camera, this.cellSize)

        if (
            this.hoverX >= 0 &&
            this.hoverY >= 0 &&
            this.world.get(this.hoverX, this.hoverY) !== BlockId.Air
        ) {
            this.renderer.drawTargetHighlight(this.hoverX, this.hoverY, this.camera, this.cellSize)
        }

        if (this.miningX >= 0 && this.miningTotal > 0) {
            const p = Math.min(1, this.miningProgress / this.miningTotal)
            this.renderer.drawBreakProgress(this.miningX, this.miningY, this.camera, this.cellSize, p)
        }

        this.renderer.drawPlayer(this.player, this.camera, this.cellSize)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MC2D()
})