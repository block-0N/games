import { BlockId } from './constants'

export interface Recipe {
    pattern: string[]
    keys: Record<string, number>
    result: { id: number; count: number }
}

// 字符约定：
// L 原木  P 木板  S 木棍  C 煤炭  R 圆石  I 铁锭
export const RECIPES: Recipe[] = [
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
    },
    {
        pattern: ['PPP', ' S ', ' S '],
        keys: { P: BlockId.Plank, S: BlockId.Stick },
        result: { id: BlockId.WoodPickaxe, count: 1 }
    },
    {
        pattern: ['RRR', ' S ', ' S '],
        keys: { R: BlockId.Cobble, S: BlockId.Stick },
        result: { id: BlockId.StonePickaxe, count: 1 }
    },
    {
        pattern: ['III', ' S ', ' S '],
        keys: { I: BlockId.IronIngot, S: BlockId.Stick },
        result: { id: BlockId.IronPickaxe, count: 1 }
    }
]