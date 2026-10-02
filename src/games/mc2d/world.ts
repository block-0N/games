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
        const id = this.get(x, y)
        return BLOCKS[id]?.solid ?? true
    }

    findGroundY(col: number): number {
        for (let y = 0; y < this.rows; y++) {
            if (this.get(col, y) !== BlockId.Air) return y
        }
        return this.rows - 1
    }

    private generate(): void {
        const baseRow = this.rows - 1

        const heights: number[] = []
        for (let col = 0; col < this.cols; col++) {
            const h =
                Math.sin(col * 0.030) * 12 +
                Math.sin(col * 0.070 + 1.7) * 6 +
                Math.sin(col * 0.170 + 3.1) * 3 +
                Math.sin(col * 0.310 + 0.5) * 1.5
            heights.push(Math.floor(baseRow - 40 + h))
        }

        for (let col = 0; col < this.cols; col++) {
            const groundY = heights[col]
            this.set(col, this.rows - 1, BlockId.Bedrock)

            for (let y = this.rows - 2; y > groundY + 3; y--) {
                this.set(col, y, BlockId.Stone)
            }
            for (let y = groundY + 3; y > groundY; y--) {
                this.set(col, y, BlockId.Dirt)
            }
            this.set(col, groundY, BlockId.Grass)
        }

        // 矿石生成（在石头层随机替换）
        const oreList: { id: BlockId; chance: number; yMin: number; yMax: number }[] = [
            { id: BlockId.CoalOre, chance: 0.02, yMin: 0.30, yMax: 0.85 },
            { id: BlockId.IronOre, chance: 0.012, yMin: 0.45, yMax: 0.95 },
            { id: BlockId.GoldOre, chance: 0.005, yMin: 0.65, yMax: 1.00 },
            { id: BlockId.DiamondOre, chance: 0.002, yMin: 0.80, yMax: 1.00 }
        ]

        for (let col = 0; col < this.cols; col++) {
            const groundY = heights[col]
            const depth = this.rows - groundY
            for (let y = groundY + 4; y < this.rows - 1; y++) {
                if (this.get(col, y) !== BlockId.Stone) continue
                const depthRatio = (y - groundY) / depth
                for (const ore of oreList) {
                    if (depthRatio < ore.yMin || depthRatio > ore.yMax) continue
                    if (Math.random() < ore.chance) {
                        this.set(col, y, ore.id)
                        break
                    }
                }
            }
        }

        // 种树
        const treeCount = 35
        const planted: number[] = []

        for (let i = 0; i < treeCount; i++) {
            const col = 6 + Math.floor(Math.random() * (this.cols - 12))
            if (planted.some(c => Math.abs(c - col) < 4)) continue
            planted.push(col)

            const groundY = this.findGroundY(col)
            if (this.get(col, groundY) !== BlockId.Grass) continue

            const trunkH = 4 + Math.floor(Math.random() * 3)
            for (let i = 1; i <= trunkH; i++) {
                this.set(col, groundY - i, BlockId.Log)
            }

            const topY = groundY - trunkH
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 1; dy++) {
                    if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue
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