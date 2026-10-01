import './styles/home.css'
import { difficulties, categories, gameList } from './data'
import type { FilterState, FilterOption, Game, Difficulty, Category } from './types'

const state: FilterState = { diff: 'all', cate: 'all' }

function getCount(field: 'difficulty' | 'category', key: string): number {
    if (key === 'all') return gameList.length
    return gameList.filter(g => g[field] === key).length
}

function updateActive(containerSelector: string, dataKey: string, value: string): void {
    document.querySelectorAll<HTMLButtonElement>(`${containerSelector} .btn`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset[dataKey] === value)
    })
}

function buildFilterButton(
    option: FilterOption,
    dataKey: 'diff' | 'cate',
    field: 'difficulty' | 'category',
    stateKey: keyof FilterState,
    containerSelector: string
): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'btn' + (option.type ? ` btn-type${option.type}` : '')
    if (option.key === state[stateKey]) btn.classList.add('active')
    btn.dataset[dataKey] = option.key
    btn.innerHTML = `<div>${getCount(field, option.key)}</div><div>${option.label}</div>`
    btn.addEventListener('click', () => {
        if (dataKey === 'diff') {
            state.diff = option.key as 'all' | Difficulty
        } else {
            state.cate = option.key as 'all' | Category
        }
        updateActive(containerSelector, dataKey, option.key)
        renderGames()
    })
    return btn
}

function renderFilterButtons(): void {
    const diffGrid = document.getElementById('difficultyGrid')!
    diffGrid.innerHTML = ''
    difficulties.forEach(d => {
        diffGrid.appendChild(buildFilterButton(d, 'diff', 'difficulty', 'diff', '.difficulty-card'))
    })

    const cateGrid = document.getElementById('categoryGrid')!
    cateGrid.innerHTML = ''
    categories.forEach(c => {
        cateGrid.appendChild(buildFilterButton(c, 'cate', 'category', 'cate', '.category-card'))
    })
}

function buildGameCard(game: Game): HTMLAnchorElement {
    const a = document.createElement('a')
    a.className = 'game-item'
    a.href = game.link
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.title = `${game.name} - 免费在线玩`

    const cover = document.createElement('div')
    cover.className = 'game-cover-box'
    cover.style.setProperty('--cover-color', game.color)

    const emoji = document.createElement('span')
    emoji.className = 'game-cover-emoji'
    emoji.textContent = game.emoji
    emoji.setAttribute('aria-hidden', 'true')
    cover.appendChild(emoji)

    const textWrap = document.createElement('div')
    textWrap.className = 'game-text'
    const nameP = document.createElement('p')
    nameP.className = 'game-name'
    nameP.textContent = game.name
    textWrap.appendChild(nameP)

    a.appendChild(cover)
    a.appendChild(textWrap)
    return a
}

function renderGames(): void {
    const grid = document.querySelector<HTMLDivElement>('.game-grid')!
    const filtered = gameList.filter(g =>
        (state.diff === 'all' || g.difficulty === state.diff) &&
        (state.cate === 'all' || g.category === state.cate)
    )
    grid.innerHTML = ''
    if (!filtered.length) {
        grid.innerHTML = `<div class="empty-tip">暂无匹配的小游戏，换个筛选条件试试</div>`
        return
    }
    const fragment = document.createDocumentFragment()
    filtered.forEach(game => fragment.appendChild(buildGameCard(game)))
    grid.appendChild(fragment)
}

document.addEventListener('DOMContentLoaded', () => {
    renderFilterButtons()
    renderGames()
})