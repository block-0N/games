import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    base: '/games/',
    build: {
        target: 'es2022',
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                '2048': fileURLToPath(new URL('./2048.html', import.meta.url)),
                minesweeper: fileURLToPath(new URL('./minesweeper.html', import.meta.url)),
                sudoku: fileURLToPath(new URL('./sudoku.html', import.meta.url)),
                tetris: fileURLToPath(new URL('./tetris.html', import.meta.url)),
                typing: fileURLToPath(new URL('./typing-game.html', import.meta.url))
            }
        }
    }
})