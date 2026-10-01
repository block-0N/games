import { WORLD_COLS, WORLD_ROWS, BlockId, BLOCKS } from './constants'

export class World {
    readonly cols = WORLD_COLS
    readonly rows = WORLD_ROWS
    readonly grid: Uint8Array

    constructor() {
        this.grid = new Uint8Array(this.cols * this.rows)
        this.generate()
    }

    get(x: number, y: number): number {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return BlockId.Bedrock
        return this.grid[y * this.cols + x]
    }

    set(x: number, y: number, id: number): void {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return
        this.grid[y * this.cols + x] = id
    }

    isSolid(x: number, y: number): boolean {
        return BLOCKS[this.get(x, y)]?.solid ?? true
    }

    // 找某一列从顶部开始第一个非空气格子的 y 坐标
    findGroundY(col: number): number {
        for (let y = 0; y < this.rows; y++) {
            if (this.get(col, y) !== BlockId.Air) return y
        }
        return this.rows - 1
    }

    private generate(): void {
        const baseRow = this.rows - 1

        // ---- 地形高度：多频正弦叠加，平滑丘陵 ----
        const heights: number[] = []
        for (let col = 0; col < this.cols; col++) {
            const h =
                Math.sin(col * 0.030) * 12 +
                Math.sin(col * 0.070 + 1.7) * 6 +
                Math.sin(col * 0.170 + 3.1) * 3 +
                Math.sin(col * 0.310 + 0.5) * 1.5

            heights.push(Math.floor(baseRow - 40 + h))
        }

        // ---- 分层填充 ----
        for (let col = 0; col < this.cols; col++) {
            const groundY = heights[col]

            // 基岩
            this.set(col, this.rows - 1, BlockId.Bedrock)

            // 石头（从底部到 groundY+3）
            for (let y = this.rows - 2; y > groundY + 3; y--) {
                this.set(col, y, BlockId.Stone)
            }

            // 泥土（groundY+1 到 groundY+3）
            for (let y = groundY + 3; y > groundY; y--) {
                this.set(col, y, BlockId.Dirt)
            }

            // 草方块
            this.set(col, groundY, BlockId.Grass)
        }

        // ---- 种树 ----
        const treeCount = 35
        const planted: number[] = []

        for (let i = 0; i < treeCount; i++) {
            const col = 6 + Math.floor(Math.random() * (this.cols - 12))

            // 保证树之间至少间隔 4 格
            if (planted.some(c => Math.abs(c - col) < 4)) continue
            planted.push(col)

            const groundY = this.findGroundY(col)
            if (this.get(col, groundY) !== BlockId.Grass) continue

            const trunkH = 4 + Math.floor(Math.random() * 3)

            // 树干
            for (let i = 1; i <= trunkH; i++) {
                this.set(col, groundY - i, BlockId.Log)
            }

            // 树叶：5x4 冠层
            const topY = groundY - trunkH
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 1; dy++) {
                    // 切角
                    if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue
                    // 顶部单格
                    if (Math.abs(dx) === 2 && dy === -2) continue
                    if (Math.random() < 0.15) continue

                    const x = col + dx
                    const y = topY + dy
                    if (this.get(x, y) === BlockId.Air) {
                        this.set(x, y, BlockId.Leaves)
                    }
                }
            }
        }
    }
}