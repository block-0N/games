import type { Recipe } from './recipes'
import { RECIPES_2X2, RECIPES_3X3 } from './recipes'

export type CraftGrid = (number | null)[]

export function findRecipe(grid: CraftGrid, recipes: Recipe[]): { recipe: Recipe; consume: number[] } | null {
    if (grid.every(x => x === null)) return null
    for (const recipe of recipes) {
        const consume = matchShaped(grid, recipe)
        if (consume) return { recipe, consume }
    }
    return null
}

export function findRecipe2x2(grid: CraftGrid) {
    return findRecipe(grid, RECIPES_2X2)
}

export function findRecipe3x3(grid: CraftGrid) {
    return findRecipe(grid, RECIPES_3X3)
}

function matchShaped(grid: CraftGrid, recipe: Recipe): number[] | null {
    const patRows = recipe.pattern.length
    const patCols = Math.max(...recipe.pattern.map(r => r.length))

    const pat: (number | null)[][] = []
    for (let r = 0; r < patRows; r++) {
        const row: (number | null)[] = []
        for (let c = 0; c < patCols; c++) {
            const ch = recipe.pattern[r][c] ?? ' '
            row.push(ch === ' ' ? null : (recipe.keys[ch] ?? null))
        }
        pat.push(row)
    }

    // grid 是 N×N 的扁平数组
    const size = Math.round(Math.sqrt(grid.length))
    const g: (number | null)[][] = []
    for (let r = 0; r < size; r++) {
        const row: (number | null)[] = []
        for (let c = 0; c < size; c++) row.push(grid[r * size + c])
        g.push(row)
    }

    let minR = size, maxR = -1, minC = size, maxC = -1
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
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
            if (gv !== null) consume.push((minR + r) * size + (minC + c))
        }
    }
    return consume
}