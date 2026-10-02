import { BlockId } from './constants'

export interface Recipe {
    pattern: string[]
    keys: Record<string, number>
    result: { id: number; count: number }
}

// 2x2 配方（背包内合成）
export const RECIPES_2X2: Recipe[] = [
    {
        pattern: ['L'],
        keys: { L: BlockId.Log },
        result: { id: BlockId.Plank, count: 4 }
    },
    {
        pattern: ['P', 'P'],
        keys: { P: BlockId.Plank },
        result: { id: BlockId.Stick, count: 4 }
    },
    {
        pattern: ['PP', 'PP'],
        keys: { P: BlockId.Plank },
        result: { id: BlockId.CraftingTable, count: 1 }
    },
    {
        pattern: ['C', 'S'],
        keys: { C: BlockId.Coal, S: BlockId.Stick },
        result: { id: BlockId.Torch, count: 4 }
    }
]

// 3x3 配方（工作台）
export const RECIPES_3X3: Recipe[] = [
    ...RECIPES_2X2,
    {
        // 8 个圆石围一圈（中空）
        pattern: ['CCC', 'C C', 'CCC'],
        keys: { C: BlockId.Cobble },
        result: { id: BlockId.Furnace, count: 1 }
    },
    {
        pattern: ['PPP', ' S ', ' S '],
        keys: { P: BlockId.Plank, S: BlockId.Stick },
        result: { id: BlockId.WoodPickaxe, count: 1 }
    },
    {
        pattern: ['CCC', ' S ', ' S '],
        keys: { C: BlockId.Cobble, S: BlockId.Stick },
        result: { id: BlockId.StonePickaxe, count: 1 }
    },
    {
        pattern: ['III', ' S ', ' S '],
        keys: { I: BlockId.IronIngot, S: BlockId.Stick },
        result: { id: BlockId.IronPickaxe, count: 1 }
    }
]