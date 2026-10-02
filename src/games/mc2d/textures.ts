import { BlockId, BLOCKS } from './constants'

const BASE = import.meta.env.BASE_URL
const cache = new Map<number, HTMLImageElement>()

export function loadAllTextures(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [idStr, def] of Object.entries(BLOCKS)) {
        const id = Number(idStr)
        if (id === BlockId.Air) continue
        if (!def.texture) continue

        const img = new Image()
        img.src = `${BASE}mc2d/textures/${def.texture}.png`

        const p = new Promise<void>(resolve => {
            img.onload = () => resolve()
            img.onerror = () => {
                console.warn(`[mc2d] 贴图加载失败: ${def.texture}.png`)
                resolve()
            }
        })

        cache.set(id, img)
        promises.push(p)
    }

    return Promise.all(promises).then(() => undefined)
}

export function getTexture(id: number): HTMLImageElement | null {
    const img = cache.get(id)
    if (!img || !img.complete || img.naturalWidth === 0) return null
    return img
}

export function getTextureUrl(id: number): string | null {
    const def = BLOCKS[id]
    if (!def?.texture) return null
    return `${BASE}mc2d/textures/${def.texture}.png`
}