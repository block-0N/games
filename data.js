const difficulties = [
    { key: "all", label: "全部", type: 0 },
    { key: "easy", label: "简单", type: 1 },
    { key: "mid", label: "中等", type: 2 },
    { key: "hard", label: "困难", type: 3 }
];

const categories = [
    { key: "all", label: "所有分类", type: 0 },
    { key: "logic", label: "逻辑推理", type: 5 },
    { key: "move", label: "移动策略", type: 8 },
    { key: "special", label: "特殊谜题", type: 9 },
    { key: "qi", label: "棋类游戏", type: 3 },
    { key: "rea", label: "反应训练", type: 2 },
    { key: "fun", label: "趣味游戏", type: 1 }
];

const gameList = [
    { name: "2048", link: "./2048.html", emoji: "🔢", color: "#3b82f6", difficulty: "mid", category: "logic" },
    { name: "扫雷", link: "./minesweeper.html", emoji: "💣", color: "#f97316", difficulty: "easy", category: "logic" },
    { name: "数独", link: "./sudoku.html", emoji: "🧩", color: "#8b5cf6", difficulty: "mid", category: "logic" },
    { name: "打字练习", link: "./typing-game.html", emoji: "⌨️", color: "#10b981", difficulty: "easy", category: "rea" },
    { name: "俄罗斯方块", link: "./tetris.html", emoji: "🧱", color: "#ef4444", difficulty: "easy", category: "fun" },
    { name: "我的世界", link: "./MC3D.html", emoji: "⛏️", color: "#22c55e", difficulty: "hard", category: "fun" },
    { name: "贪吃蛇", link: "https://gallery.selfboot.cn/zh/games/snake", emoji: "🐍", color: "#16a34a", difficulty: "mid", category: "fun" },
    { name: "推箱子", link: "https://gallery.selfboot.cn/zh/games/sokoban", emoji: "📦", color: "#a16207", difficulty: "mid", category: "move" },
    { name: "数字华容道", link: "https://gallery.selfboot.cn/zh/games/sliding", emoji: "🔀", color: "#0ea5e9", difficulty: "mid", category: "move" },
    { name: "五子棋", link: "https://gallery.selfboot.cn/zh/games/gomoku", emoji: "⚫", color: "#1f2937", difficulty: "mid", category: "qi" },
    { name: "中国象棋", link: "https://gallery.selfboot.cn/zh/games/chess", emoji: "♟️", color: "#b91c1c", difficulty: "hard", category: "qi" },
    { name: "wordle", link: "https://wordle.online/", emoji: "🔤", color: "#eab308", difficulty: "mid", category: "special" }
];