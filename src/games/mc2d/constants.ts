export const WORLD_COLS = 200
export const WORLD_ROWS = 200

export const HOTBAR_SIZE = 9
export const MAX_STACK = 64

export const enum BlockId {
    Air = 0,
    // 方块
    Bedrock = 1,
    Stone = 2,
    Cobble = 3,
    Dirt = 4,
    Grass = 5,
    Log = 6,
    Leaves = 7,
    Plank = 8,
    CoalOre = 9,
    IronOre = 10,
    GoldOre = 11,
    DiamondOre = 12,
    CraftingTable = 13,
    Torch = 14,
    // 材料
    Coal = 20,
    IronIngot = 21,
    GoldIngot = 22,
    Diamond = 23,
    Stick = 24,
    // 工具
    WoodPickaxe = 30,
    StonePickaxe = 31,
    IronPickaxe = 32,
    // 食物
    Apple = 40,
    Bread = 41,
}

export interface ItemDef {
    name: string
    color: string
    placeable: boolean
    solid: boolean
    unbreakable?: boolean
    /** 食物回复饥饿值 */
    food?: number
    /** 工具挖掘等级，0 或 undefined 表示不是工具 */
    toolLevel?: number
}

export const BLOCKS: Record<number, ItemDef> = {
    [BlockId.Air]: { name: '空气', color: 'transparent', placeable: false, solid: false },
    [BlockId.Bedrock]: { name: '基岩', color: '#2a2a2a', placeable: true, solid: true, unbreakable: true },
    [BlockId.Stone]: { name: '石头', color: '#6e6e6e', placeable: true, solid: true },
    [BlockId.Cobble]: { name: '圆石', color: '#5c5c5c', placeable: true, solid: true },
    [BlockId.Dirt]: { name: '泥土', color: '#8b572a', placeable: true, solid: true },
    [BlockId.Grass]: { name: '草方块', color: '#4caf50', placeable: true, solid: true },
    [BlockId.Log]: { name: '橡木原木', color: '#6d4c41', placeable: true, solid: true },
    [BlockId.Leaves]: { name: '橡树树叶', color: '#2e7d32', placeable: true, solid: true },
    [BlockId.Plank]: { name: '橡木木板', color: '#a1887f', placeable: true, solid: true },
    [BlockId.CoalOre]: { name: '煤矿石', color: '#4a4a4a', placeable: true, solid: true },
    [BlockId.IronOre]: { name: '铁矿石', color: '#a57c5c', placeable: true, solid: true },
    [BlockId.GoldOre]: { name: '金矿石', color: '#c9a227', placeable: true, solid: true },
    [BlockId.DiamondOre]: { name: '钻石矿石', color: '#4dd0e1', placeable: true, solid: true },
    [BlockId.CraftingTable]: { name: '工作台', color: '#8a6c4a', placeable: true, solid: true },
    [BlockId.Torch]: { name: '火把', color: '#ffb300', placeable: true, solid: false },
    [BlockId.Coal]: { name: '煤炭', color: '#1a1a1a', placeable: false, solid: false },
    [BlockId.IronIngot]: { name: '铁锭', color: '#cfcfcf', placeable: false, solid: false },
    [BlockId.GoldIngot]: { name: '金锭', color: '#f0d060', placeable: false, solid: false },
    [BlockId.Diamond]: { name: '钻石', color: '#4dd0e1', placeable: false, solid: false },
    [BlockId.Stick]: { name: '木棍', color: '#8a6c4a', placeable: false, solid: false },
    [BlockId.WoodPickaxe]: { name: '木镐', color: '#c19a6b', placeable: false, solid: false, toolLevel: 1 },
    [BlockId.StonePickaxe]: { name: '石镐', color: '#9e9e9e', placeable: false, solid: false, toolLevel: 2 },
    [BlockId.IronPickaxe]: { name: '铁镐', color: '#e0e0e0', placeable: false, solid: false, toolLevel: 3 },
    [BlockId.Apple]: { name: '苹果', color: '#e74c3c', placeable: false, solid: false, food: 4 },
    [BlockId.Bread]: { name: '面包', color: '#d2a56b', placeable: false, solid: false, food: 6 },
}

export const GRAVITY_INTERVAL = 180
export const MOVE_HUNGER_STEP = 20
export const MAX_HEALTH = 10
export const MAX_HUNGER = 10
export const STARVE_INTERVAL = 3000
export const HEAL_INTERVAL = 2000