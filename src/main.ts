import './styles/theme.css'
import './styles/home.css'
import { difficulties, categories, gameList } from './data'
import type { FilterState, FilterOption, Game, Difficulty, Category } from './types'

const state: FilterState = { diff: 'all', cate: 'all' }

function getCount(field: 'difficulty' | 'category', key: string): number {
    if (key === 'all') return gameList.length
    return gameList.filter(g => g[field] === key).length
}

function createChip(
    option: FilterOption,
    isActive: boolean,
    count: number,
    onClick: () => void
): HTMLButtonElement {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'chip' + (isActive ? ' is-active' : '')

    const label = document.createTextNode(option.label)
    chip.appendChild(label)

    const countEl = document.createElement('span')
    countEl.className = 'chip__count'
    countEl.textContent = String(count)
    chip.appendChild(countEl)

    chip.addEventListener('click', onClick)
    return chip
}

function renderDifficultyChips(): void {
    const container = document.getElementById('difficulty-chips')
    if (!container) return
    container.innerHTML = ''

    difficulties.forEach(d => {
        const chip = createChip(d, state.diff === d.key, getCount('difficulty', d.key), () => {
            state.diff = d.key as 'all' | Difficulty
            renderDifficultyChips()
            renderGames()
        })
        container.appendChild(chip)
    })
}

function renderCategoryChips(): void {
    const container = document.getElementById('category-chips')
    if (!container) return
    container.innerHTML = ''

    categories.forEach(c => {
        const chip = createChip(c, state.cate === c.key, getCount('category', c.key), () => {
            state.cate = c.key as 'all' | Category
            renderCategoryChips()
            renderGames()
        })
        container.appendChild(chip)
    })
}

function createGameCard(game: Game): HTMLAnchorElement {
    const a = document.createElement('a')
    a.className = 'game-card'
    a.href = game.link
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.style.setProperty('--card-color', game.color)

    const cover = document.createElement('div')
    cover.className = 'game-card__cover'

    const emoji = document.createElement('span')
    emoji.className = 'game-card__emoji'
    emoji.textContent = game.emoji
    emoji.setAttribute('aria-hidden', 'true')
    cover.appendChild(emoji)

    const name = document.createElement('div')
    name.className = 'game-card__name'
    name.textContent = game.name

    a.appendChild(cover)
    a.appendChild(name)
    return a
}

function renderGames(): void {
    const grid = document.getElementById('game-grid')
    if (!grid) return

    const filtered = gameList.filter(g =>
        (state.diff === 'all' || g.difficulty === state.diff) &&
        (state.cate === 'all' || g.category === state.cate)
    )

    grid.innerHTML = ''

    if (filtered.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'empty-tip'
        empty.textContent = '暂无匹配的小游戏，换个筛选条件试试'
        grid.appendChild(empty)
        return
    }

    const fragment = document.createDocumentFragment()
    filtered.forEach(game => fragment.appendChild(createGameCard(game)))
    grid.appendChild(fragment)
}

function init(): void {
    renderDifficultyChips()
    renderCategoryChips()
    renderGames()
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
} else {
    init()
}