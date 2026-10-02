import { BlockId } from './constants'

export interface SmeltRecipe {
    input: number
    output: number
    count: number
}

export const SMELT_RECIPES: SmeltRecipe[] = [
    { input: BlockId.RawIron, output: BlockId.IronIngot, count: 1 },
    { input: BlockId.RawGold, output: BlockId.GoldIngot, count: 1 }
]

export function findSmelt(inputId: number | null): SmeltRecipe | null {
    if (inputId === null) return null
    return SMELT_RECIPES.find(r => r.input === inputId) ?? null
}