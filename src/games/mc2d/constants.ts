export const WORLD_COLS = 200
export const WORLD_ROWS = 200
export const HOTBAR_SIZE = 9
export const MAX_STACK = 64

export const enum BlockId {
    Air = 0,
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
    Furnace = 14,
    Torch = 15,

    Coal = 20,
    RawIron = 21,
    RawGold = 22,
    IronIngot = 23,
    GoldIngot = 24,
    Diamond = 25,
    Stick = 26,

    WoodPickaxe = 30,
    StonePickaxe = 31,
    IronPickaxe = 32,

    Apple = 40,
    Bread = 41,
}

export interface ItemDef {
    name: string
    color: string
    placeable: boolean
    solid: boolean
    unbreakable?: boolean
    food?: number          // 食用回复饥饿
    fuel?: number          // 熔炉燃料可烧几个
    toolLevel?: number     // 1=木 2=石 3=铁
    breakMinLevel?: number // 挖这个方块需要的最低工具等级
    breakTime?: number     // 基础挖掘时间(ms)
    lightRadius?: number   // 光源半径(格)
    drops?: number         // 掉落物 id（默认自身）
    dropChance?: number    // 掉落概率（默认 1）
}

export const BLOCKS: Record<number, ItemDef> = {
    [BlockId.Air]: { name: '空气', color: 'transparent', placeable: false, solid: false },
    [BlockId.Bedrock]: { name: '基岩', color: '#2a2a2a', placeable: true, solid: true, unbreakable: true },
    [BlockId.Stone]: { name: '石头', color: '#6e6e6e', placeable: true, solid: true, breakMinLevel: 1, breakTime: 1200, drops: BlockId.Cobble },
    [BlockId.Cobble]: { name: '圆石', color: '#5c5c5c', placeable: true, solid: true, breakMinLevel: 1, breakTime: 1200 },
    [BlockId.Dirt]: { name: '泥土', color: '#8b572a', placeable: true, solid: true, breakTime: 350 },
    [BlockId.Grass]: { name: '草方块', color: '#4caf50', placeable: true, solid: true, breakTime: 350, drops: BlockId.Dirt },
    [BlockId.Log]: { name: '橡木原木', color: '#6d4c41', placeable: true, solid: true, breakTime: 700 },
    [BlockId.Leaves]: { name: '橡树树叶', color: '#2e7d32', placeable: true, solid: true, breakTime: 250, drops: BlockId.Apple, dropChance: 0.12 },
    [BlockId.Plank]: { name: '橡木木板', color: '#a1887f', placeable: true, solid: true, breakTime: 600, fuel: 1 },
    [BlockId.CoalOre]: { name: '煤矿石', color: '#4a4a4a', placeable: true, solid: true, breakMinLevel: 1, breakTime: 1400, drops: BlockId.Coal },
    [BlockId.IronOre]: { name: '铁矿石', color: '#a57c5c', placeable: true, solid: true, breakMinLevel: 2, breakTime: 1800, drops: BlockId.RawIron },
    [BlockId.GoldOre]: { name: '金矿石', color: '#c9a227', placeable: true, solid: true, breakMinLevel: 2, breakTime: 1800, drops: BlockId.RawGold },
    [BlockId.DiamondOre]: { name: '钻石矿石', color: '#4dd0e1', placeable: true, solid: true, breakMinLevel: 2, breakTime: 2200, drops: BlockId.Diamond },
    [BlockId.CraftingTable]: { name: '工作台', color: '#8a6c4a', placeable: true, solid: true, breakTime: 700 },
    [BlockId.Furnace]: { name: '熔炉', color: '#6b6b6b', placeable: true, solid: true, breakMinLevel: 1, breakTime: 1400 },
    [BlockId.Torch]: { name: '火把', color: '#ffb300', placeable: true, solid: false, breakTime: 50, lightRadius: 6 },

    [BlockId.Coal]: { name: '煤炭', color: '#1a1a1a', placeable: false, solid: false, fuel: 8 },
    [BlockId.RawIron]: { name: '原铁', color: '#c9a68a', placeable: false, solid: false },
    [BlockId.RawGold]: { name: '原金', color: '#e0c060', placeable: false, solid: false },
    [BlockId.IronIngot]: { name: '铁锭', color: '#cfcfcf', placeable: false, solid: false },
    [BlockId.GoldIngot]: { name: '金锭', color: '#f0d060', placeable: false, solid: false },
    [BlockId.Diamond]: { name: '钻石', color: '#4dd0e1', placeable: false, solid: false },
    [BlockId.Stick]: { name: '木棍', color: '#8a6c4a', placeable: false, solid: false, fuel: 1 },

    [BlockId.WoodPickaxe]: { name: '木镐', color: '#c19a6b', placeable: false, solid: false, toolLevel: 1, fuel: 1 },
    [BlockId.StonePickaxe]: { name: '石镐', color: '#9e9e9e', placeable: false, solid: false, toolLevel: 2 },
    [BlockId.IronPickaxe]: { name: '铁镐', color: '#e0e0e0', placeable: false, solid: false, toolLevel: 3 },

    [BlockId.Apple]: { name: '苹果', color: '#e74c3c', placeable: false, solid: false, food: 4 },
    [BlockId.Bread]: { name: '面包', color: '#d2a56b', placeable: false, solid: false, food: 6 },
}

// 挖掘工具倍率：工具等级 → 速度倍率
export const TOOL_MULTIPLIER: Record<number, number> = {
    0: 1,
    1: 3,
    2: 5,
    3: 8,
}

export const GRAVITY_INTERVAL = 180
export const MOVE_HUNGER_STEP = 20
export const MAX_HEALTH = 10
export const MAX_HUNGER = 10
export const STARVE_INTERVAL = 3000
export const HEAL_INTERVAL = 2000
export const FALL_SAFE_DISTANCE = 3  // 安全下落格数
export const FURNACE_SMELT_MS = 2000 // 熔炉烧一个物品的时间