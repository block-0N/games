export type Difficulty = 'easy' | 'mid' | 'hard'

export type Category = 'logic' | 'rea' | 'fun' | 'move' | 'qi' | 'special'

export interface Game {
    name: string
    link: string
    emoji: string
    color: string
    difficulty: Difficulty
    category: Category
}

export interface FilterOption {
    key: 'all' | Difficulty | Category
    label: string
    type: number
}

export interface FilterState {
    diff: 'all' | Difficulty
    cate: 'all' | Category
}