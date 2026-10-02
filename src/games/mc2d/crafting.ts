import type { Recipe } from './recipes'
import { RECIPES } from './recipes'

export type CraftGrid = (number | null)[]

/**
 * 在 3x3 网格中查找匹配的配方
 * 返回配方和要消耗的格子索引列表（相对 3x3）
 */
export function findRecipe(grid: CraftGrid): { recipe: Recipe; consume: number[] } | null {
    if (grid.every(x => x === null)) return null

    for (const recipe of RECIPES) {
        const consume = matchShaped(grid, recipe)
        if (consume) return { recipe, consume }
    }
    return null
}

function matchShaped(grid: CraftGrid, recipe: Recipe): number[] | null {
    const patRows = recipe.pattern.length
    const patCols = Math.max(...recipe.pattern.map(r => r.length))

    // 图案 → ID 2D
    const pat: (number | null)[][] = []
    for (let r = 0; r < patRows; r++) {
        const row: (number | null)[] = []
        for (let c = 0; c < patCols; c++) {
            const ch = recipe.pattern[r][c] ?? ' '
            row.push(ch === ' ' ? null : (recipe.keys[ch] ?? null))
        }
        pat.push(row)
    }

    // grid → 2D
    const g: (number | null)[][] = []
    for (let r = 0; r < 3; r++) {
        const row: (number | null)[] = []
        for (let c = 0; c < 3; c++) row.push(grid[r * 3 + c])
        g.push(row)
    }

    // 找 grid 最小包围盒
    let minR = 3, maxR = -1, minC = 3, maxC = -1
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (g[r][c] !== null) {
                if (r < minR) minR = r
                if (r > maxR) maxR = r
                if (c < minC) minC = c
                if (c > maxC) maxC = c
            }
        }
    }
    if (maxR === -1) return null

    const h = maxR - minR + 1
    const w = maxC - minC + 1
    if (h !== patRows || w !== patCols) return null

    const consume: number[] = []
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            const gv = g[minR + r][minC + c]
            const pv = pat[r][c]
            if (gv !== pv) return null
            if (gv !== null) consume.push((minR + r) * 3 + (minC + c))
        }
    }
    return consume
}