import { BlockId, BLOCKS } from './constants'
import type { World } from './world'

/**
 * 扫描世界，收集所有光源位置
 * 因为世界比较大（200x200），全图扫描一次即可
 */
export function collectLightSources(world: World): { x: number; y: number; radius: number }[] {
    const list: { x: number; y: number; radius: number }[] = []
    for (let y = 0; y < world.rows; y++) {
        for (let x = 0; x < world.cols; x++) {
            const id = world.get(x, y)
            if (id === BlockId.Torch) {
                list.push({ x, y, radius: BLOCKS[id].lightRadius ?? 0 })
            }
        }
    }
    return list
}

/**
 * 绘制火把光晕（叠加层）
 */
export function drawTorchLights(
    ctx: CanvasRenderingContext2D,
    lights: { x: number; y: number; radius: number }[],
    camera: { x: number; y: number },
    cellSize: number,
    viewCols: number,
    viewRows: number
): void {
    if (lights.length === 0) return

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    for (const light of lights) {
        const sx = (light.x - camera.x + 0.5) * cellSize
        const sy = (light.y - camera.y + 0.5) * cellSize

        // 剔除屏幕外的
        if (sx < -cellSize * light.radius || sx > viewCols * cellSize + cellSize * light.radius) continue
        if (sy < -cellSize * light.radius || sy > viewRows * cellSize + cellSize * light.radius) continue

        const r = cellSize * light.radius
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r)
        grad.addColorStop(0, 'rgba(255, 220, 150, 0.45)')
        grad.addColorStop(0.5, 'rgba(255, 200, 120, 0.18)')
        grad.addColorStop(1, 'rgba(255, 200, 120, 0)')

        ctx.fillStyle = grad
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
    }

    ctx.restore()
}