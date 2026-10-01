import { BLOCKS, BlockId } from './constants'
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

export class Renderer {
    constructor(
        private readonly ctx: CanvasRenderingContext2D,
        private readonly canvas: HTMLCanvasElement
    ) { }

    clear(): void {
        // 天空
        this.ctx.fillStyle = '#87ceeb'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    drawWorld(world: World, camera: Camera, cellSize: number): void {
        const viewCols = Math.ceil(this.canvas.width / cellSize)
        const viewRows = Math.ceil(this.canvas.height / cellSize)
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

        ctx.fillStyle = def.color
        ctx.fillRect(x, y, size, size)

        // 顶部高光
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(x, y, size, Math.max(1, size * 0.1))

        // 右侧阴影
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fillRect(x + size - Math.max(1, size * 0.08), y, Math.max(1, size * 0.08), size)

        // 底部阴影
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.fillRect(x, y + size - Math.max(1, size * 0.08), size, Math.max(1, size * 0.08))

        // 网格线
        if (size >= 16) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'
            ctx.lineWidth = 1
            ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)
        }
    }

    drawPlayer(player: PlayerView, camera: Camera, cellSize: number): void {
        const ctx = this.ctx
        const sx = (player.x - camera.x) * cellSize
        const sy = (player.y - camera.y) * cellSize

        const bodyTop = player.sneaking ? sy : sy - cellSize  // 头顶 y
        const height = player.sneaking ? cellSize : cellSize * 2

        // 身体比例
        const bodyWidth = cellSize * 0.7
        const bodyX = sx + (cellSize - bodyWidth) / 2

        // 头（占上 40%）
        const headH = height * 0.4
        ctx.fillStyle = '#ffd5b5'
        ctx.fillRect(bodyX, bodyTop, bodyWidth, headH)

        // 头发
        ctx.fillStyle = '#6b4226'
        ctx.fillRect(bodyX, bodyTop, bodyWidth, headH * 0.3)

        // 衣服（占下 60%）
        const torsoY = bodyTop + headH
        const torsoH = height - headH
        ctx.fillStyle = '#3498db'
        ctx.fillRect(bodyX, torsoY, bodyWidth, torsoH * 0.7)

        // 腿
        ctx.fillStyle = '#2c3e50'
        const legH = torsoH * 0.3
        const legW = bodyWidth * 0.45
        ctx.fillRect(bodyX, torsoY + torsoH * 0.7, legW, legH)
        ctx.fillRect(bodyX + bodyWidth - legW, torsoY + torsoH * 0.7, legW, legH)
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
}