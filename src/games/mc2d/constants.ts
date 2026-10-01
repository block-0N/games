// ============================================
// 常量与方块定义
// ============================================

export const WORLD_COLS = 200
export const WORLD_ROWS = 200

export const HOTBAR_SIZE = 9
export const MAX_STACK = 64

// 方块 ID
export const enum BlockId {
    Air = 0,
    Bedrock = 1,
    Stone = 2,
    Dirt = 3,
    Grass = 4,
    Log = 5,
    Leaves = 6,
    Plank = 7,
}

export interface BlockDef {
    name: string
    color: string
    solid: boolean
    unbreakable?: boolean
}

export const BLOCKS: Record<number, BlockDef> = {
    [BlockId.Air]: { name: '空气', color: 'transparent', solid: false },
    [BlockId.Bedrock]: { name: '基岩', color: '#2a2a2a', solid: true, unbreakable: true },
    [BlockId.Stone]: { name: '石头', color: '#6e6e6e', solid: true },
    [BlockId.Dirt]: { name: '泥土', color: '#8b572a', solid: true },
    [BlockId.Grass]: { name: '草方块', color: '#4caf50', solid: true },
    [BlockId.Log]: { name: '橡木原木', color: '#6d4c41', solid: true },
    [BlockId.Leaves]: { name: '橡树树叶', color: '#2e7d32', solid: true },
    [BlockId.Plank]: { name: '橡木木板', color: '#a1887f', solid: true },
}

// 玩家物理
export const GRAVITY_INTERVAL = 180   // 每多少毫秒下落一格
export const MOVE_HUNGER_STEP = 20    // 每移动多少格消耗 1 点饥饿

// 生命/饥饿
export const MAX_HEALTH = 10
export const MAX_HUNGER = 10
export const STARVE_INTERVAL = 3000   // 饥饿归零后每几毫秒掉 1 血
export const HEAL_INTERVAL = 2000     // 饥饿回满后每几毫秒回 1 血