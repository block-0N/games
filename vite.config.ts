import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
    base: '/games/',
    build: {
        target: 'es2022',
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                '2048': resolve(__dirname, '2048.html'),
                minesweeper: resolve(__dirname, 'minesweeper.html'),
                sudoku: resolve(__dirname, 'sudoku.html'),
                tetris: resolve(__dirname, 'tetris.html'),
                typing: resolve(__dirname, 'typing-game.html')
            }
        }
    }
})