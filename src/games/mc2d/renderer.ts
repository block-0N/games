import { BLOCKS, BlockId } from './constants'
import { getTexture } from './textures'
import type { World } from './world'

export interface Camera {
    x: number
    y: number
}

export interface PlayerView {
    x: number
    y: number
    sneaking: boolean
}

export interface LightSource {
    x: number
    y: number
    radius: number
}

export class Renderer {
    private dpr = 1

    constructor(
        private readonly ctx: CanvasRenderingContext2D,
        private readonly canvas: HTMLCanvasElement
    ) { }

    setDpr(dpr: number): void {
        this.dpr = dpr
    }

    /** 逻辑宽度（CSS 像素） */
    private get cssW(): number {
        return this.canvas.width / this.dpr
    }

    /** 逻辑高度（CSS 像素） */
    private get cssH(): number {
        return this.canvas.height / this.dpr
    }

    clear(): void {
        this.ctx.imageSmoothingEnabled = false
        this.ctx.fillStyle = '#87ceeb'
        this.ctx.fillRect(0, 0, this.cssW, this.cssH)
    }

    drawWorld(world: World, camera: Camera, cellSize: number): void {
        this.ctx.imageSmoothingEnabled = false

        const viewCols = Math.ceil(this.cssW / cellSize)
        const viewRows = Math.ceil(this.cssH / cellSize)
        const startX = Math.floor(camera.x)
        const startY = Math.floor(camera.y)

        for (let r = -1; r <= viewRows; r++) {
            for (let c = -1; c <= viewCols; c++) {
                const wx = startX + c
                const wy = startY + r
                const block = world.get(wx, wy)
                if (block === BlockId.Air) continue

                const sx = (wx - camera.x) * cellSize
                const sy = (wy - camera.y) * cellSize
                this.drawBlock(sx, sy, cellSize, block)
            }
        }
    }

    private drawBlock(x: number, y: number, size: number, block: number): void {
        const def = BLOCKS[block]
        if (!def) return

        const ctx = this.ctx
        const img = getTexture(block)

        if (img) {
            ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(size), Math.round(size))
        } else {
            ctx.fillStyle = def.color
            ctx.fillRect(x, y, size, size)
            ctx.fillStyle = 'rgba(255,255,255,0.18)'
            ctx.fillRect(x, y, size, Math.max(1, size * 0.1))
            ctx.fillStyle = 'rgba(0,0,0,0.18)'
            ctx.fillRect(x + size - Math.max(1, size * 0.08), y, Math.max(1, size * 0.08), size)
        }

        if (size >= 16) {
            ctx.strokeStyle = 'rgba(0,0,0,0.12)'
            ctx.lineWidth = 1
            ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
        }
    }

    drawLights(lights: LightSource[], camera: Camera, cellSize: number): void {
        if (lights.length === 0) return

        const ctx = this.ctx
        const viewCols = Math.ceil(this.cssW / cellSize)
        const viewRows = Math.ceil(this.cssH / cellSize)

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        for (const light of lights) {
            const sx = (light.x - camera.x + 0.5) * cellSize
            const sy = (light.y - camera.y + 0.5) * cellSize

            if (sx < -cellSize * light.radius || sx > viewCols * cellSize + cellSize * light.radius) continue
            if (sy < -cellSize * light.radius || sy > viewRows * cellSize + cellSize * light.radius) continue

            const r = cellSize * light.radius
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
            grad.addColorStop(0, 'rgba(255, 220, 150, 0.5)')
            grad.addColorStop(0.5, 'rgba(255, 200, 120, 0.2)')
            grad.addColorStop(1, 'rgba(255, 200, 120, 0)')

            ctx.fillStyle = grad
            ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
        }

        ctx.restore()
    }

    drawPlayer(player: PlayerView, camera: Camera, cellSize: number): void {
        const ctx = this.ctx
        const height = player.sneaking ? 1 : 2

        const sx = (player.x - camera.x) * cellSize
        const sy = (player.y - camera.y) * cellSize
        const bodyW = cellSize * 0.8
        const bodyH = cellSize * height
        const bodyX = sx + (cellSize - bodyW) / 2

        const headH = bodyH * 0.4

        // 头
        ctx.fillStyle = '#ffd5b5'
        ctx.fillRect(bodyX, sy, bodyW, headH)

        // 头发
        ctx.fillStyle = '#6b4226'
        ctx.fillRect(bodyX, sy, bodyW, headH * 0.3)

        // 眼睛
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(bodyX + bodyW * 0.2, sy + headH * 0.5, bodyW * 0.12, headH * 0.15)
        ctx.fillRect(bodyX + bodyW * 0.68, sy + headH * 0.5, bodyW * 0.12, headH * 0.15)

        // 身体
        const torsoY = sy + headH
        const torsoH = bodyH * 0.6
        ctx.fillStyle = '#3498db'
        ctx.fillRect(bodyX, torsoY, bodyW, torsoH * 0.7)

        // 腿
        ctx.fillStyle = '#2c3e50'
        const legH = torsoH * 0.3
        const legW = bodyW * 0.45
        ctx.fillRect(bodyX, torsoY + torsoH * 0.7, legW, legH)
        ctx.fillRect(bodyX + bodyW - legW, torsoY + torsoH * 0.7, legW, legH)
    }

    drawTargetHighlight(
        worldX: number,
        worldY: number,
        camera: Camera,
        cellSize: number
    ): void {
        const sx = (worldX - camera.x) * cellSize
        const sy = (worldY - camera.y) * cellSize
        const ctx = this.ctx

        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2
        ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2)
    }

    drawBreakProgress(
        worldX: number,
        worldY: number,
        camera: Camera,
        cellSize: number,
        progress: number
    ): void {
        if (progress <= 0) return
        const sx = (worldX - camera.x) * cellSize
        const sy = (worldY - camera.y) * cellSize
        const ctx = this.ctx

        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.fillRect(sx, sy, cellSize * progress, cellSize)
        ctx.restore()
    }
}