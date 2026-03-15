class TypingGame {
    constructor() {
        // 难度配置
        this.difficulties = {
            easy: {
                duration: 60,
                texts: {
                    english: [
                        "The quick brown fox jumps over the lazy dog.",
                        "A journey of a thousand miles begins with a single step.",
                        "To be or not to be that is the question.",
                        "All that glitters is not gold.",
                        "Practice makes perfect."
                    ],
                    chinese: [
                        "千里之行，始于足下。",
                        "学而时习之，不亦说乎。",
                        "天行健，君子以自强不息。",
                        "三人行，必有我师焉。",
                        "温故而知新，可以为师矣。"
                    ]
                }
            },
            medium: {
                duration: 90,
                texts: {
                    english: [
                        "The only way to do great work is to love what you do.",
                        "Success is not final failure is not fatal it is the courage to continue that counts.",
                        "In the middle of difficulty lies opportunity for growth and success.",
                        "Life is what happens when you are busy making other plans.",
                        "The greatest glory in living lies not in never falling but in rising every time we fall."
                    ],
                    chinese: [
                        "宝剑锋从磨砺出，梅花香自苦寒来。",
                        "书山有路勤为径，学海无涯苦作舟。",
                        "业精于勤荒于嬉，行成于思毁于随。",
                        "路漫漫其修远兮，吾将上下而求索。",
                        "不积跬步，无以至千里；不积小流，无以成江海。"
                    ]
                }
            },
            hard: {
                duration: 120,
                texts: {
                    english: [
                        "Programming is thinking not typing unfortunately most programmers spend more time typing than thinking.",
                        "The difference between ordinary and extraordinary is that little extra which makes all the difference in the world.",
                        "Technology is best when it brings people together and helps them communicate more effectively and efficiently.",
                        "The future belongs to those who believe in the beauty of their dreams and work hard to achieve them.",
                        "Innovation distinguishes between a leader and a follower and drives progress forward in every field."
                    ],
                    chinese: [
                        "纸上得来终觉浅，绝知此事要躬行。问渠那得清如许，为有源头活水来。",
                        "山重水复疑无路，柳暗花明又一村。众里寻他千百度，蓦然回首，那人却在灯火阑珊处。",
                        "大鹏一日同风起，扶摇直上九万里。长风破浪会有时，直挂云帆济沧海。",
                        "千磨万击还坚劲，任尔东西南北风。咬定青山不放松，立根原在破岩中。",
                        "春蚕到死丝方尽，蜡炬成灰泪始干。晓镜但愁云鬓改，夜吟应觉月光寒。"
                    ]
                }
            }
        };

        this.currentDifficulty = 'easy';
        this.currentLanguage = 'random';
        this.currentText = '';
        this.currentIndex = 0;
        this.isStarted = false;
        this.isFinished = false;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.correctChars = 0;
        this.totalChars = 0;
        this.errors = 0;
        this.startTime = null;

        this.textDisplay = document.getElementById('text-display');
        this.timerElement = document.getElementById('timer');
        this.wpmElement = document.getElementById('wpm');
        this.accuracyElement = document.getElementById('accuracy');
        this.charsElement = document.getElementById('chars');
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.resultModal = document.getElementById('result-modal');
        this.finalWpmElement = document.getElementById('final-wpm');
        this.finalAccuracyElement = document.getElementById('final-accuracy');
        this.finalCharsElement = document.getElementById('final-chars');
        this.finalErrorsElement = document.getElementById('final-errors');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.difficultyBtns = document.querySelectorAll('.difficulty-btn');
        this.languageBtns = document.querySelectorAll('.language-btn');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.resetGame();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.closeModalBtn.addEventListener('click', () => {
            this.resultModal.style.display = 'none';
            this.startBtn.textContent = '开始练习';
            this.startBtn.disabled = false;
        });

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentDifficulty = e.target.dataset.difficulty;
                this.difficultyBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.resetGame();
            });
        });

        this.languageBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentLanguage = e.target.dataset.language;
                this.languageBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.resetGame();
            });
        });

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    resetGame() {
        this.stopTimer();
        this.isStarted = false;
        this.isFinished = false;
        this.currentIndex = 0;
        this.correctChars = 0;
        this.totalChars = 0;
        this.errors = 0;
        this.startTime = null;

        const config = this.difficulties[this.currentDifficulty];
        this.timeLeft = config.duration;

        // 选择文本
        let availableTexts;
        if (this.currentLanguage === 'random') {
            // 随机选择中文或英文
            const languageChoice = Math.random() < 0.5 ? 'english' : 'chinese';
            availableTexts = config.texts[languageChoice];
        } else {
            availableTexts = config.texts[this.currentLanguage];
        }
        this.currentText = availableTexts[Math.floor(Math.random() * availableTexts.length)];

        this.updateStats();
        this.renderText();
        this.hideModal();
    }

    startGame() {
        if (this.isStarted || this.isFinished) return;

        this.isStarted = true;
        this.startTime = Date.now();
        this.startBtn.textContent = '练习中...';
        this.startBtn.disabled = true;

        this.startTimer();
        this.renderText();
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateStats();

            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    handleKeyDown(e) {
        if (this.isFinished) return;

        // 如果还没开始，按任意键开始
        if (!this.isStarted && e.key.length === 1) {
            this.startGame();
        }

        if (!this.isStarted) return;

        const char = e.key;

        // 忽略功能键
        if (char.length > 1 && char !== 'Backspace' && char !== 'Delete') {
            return;
        }

        if (char === 'Backspace' || char === 'Delete') {
            this.handleBackspace();
        } else if (char.length === 1) {
            this.handleCharInput(char);
        }

        this.renderText();
        this.updateStats();

        // 检查是否完成
        if (this.currentIndex >= this.currentText.length) {
            this.endGame();
        }
    }

    handleCharInput(char) {
        if (this.currentIndex < this.currentText.length) {
            this.totalChars++;
            const expectedChar = this.currentText[this.currentIndex];

            if (char === expectedChar) {
                this.correctChars++;
            } else {
                this.errors++;
            }

            this.currentIndex++;
        }
    }

    handleBackspace() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const char = this.currentText[this.currentIndex];

            // 检查这个字符之前是否被正确输入
            if (this.correctChars > 0 && this.currentIndex < this.correctChars) {
                // 减少正确字符计数
                this.correctChars--;
            } else if (this.errors > 0) {
                // 减少错误计数
                this.errors--;
            }

            this.totalChars--;
        }
    }

    renderText() {
        this.textDisplay.innerHTML = '';

        for (let i = 0; i < this.currentText.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = this.currentText[i];

            if (i < this.currentIndex) {
                // 已经输入的字符
                if (this.currentText[i] === this.getCurrentInputChar(i)) {
                    charSpan.classList.add('correct');
                } else {
                    charSpan.classList.add('incorrect');
                }
            } else if (i === this.currentIndex && this.isStarted) {
                // 当前要输入的字符
                charSpan.classList.add('current');
            } else {
                // 还未输入的字符
                charSpan.classList.add('pending');
            }

            this.textDisplay.appendChild(charSpan);
        }
    }

    getCurrentInputChar(index) {
        // 这个方法简化处理，实际上需要跟踪用户输入的历史
        // 为了简化，我们假设输入的顺序和原始文本顺序一致
        if (index < this.correctChars) {
            return this.currentText[index];
        }
        return null;
    }

    updateStats() {
        this.timerElement.textContent = this.timeLeft;
        this.charsElement.textContent = this.totalChars;

        // 计算WPM
        if (this.startTime) {
            const timeElapsed = (Date.now() - this.startTime) / 1000 / 60; // 分钟
            const wpm = Math.round((this.correctChars / 5) / timeElapsed) || 0;
            this.wpmElement.textContent = wpm;
        } else {
            this.wpmElement.textContent = '0';
        }

        // 计算准确率
        const accuracy = this.totalChars > 0 
            ? Math.round((this.correctChars / this.totalChars) * 100) 
            : 100;
        this.accuracyElement.textContent = accuracy + '%';
    }

    endGame() {
        this.isFinished = true;
        this.stopTimer();

        // 计算最终统计
        const timeElapsed = this.difficulties[this.currentDifficulty].duration / 60; // 分钟
        const wpm = Math.round((this.correctChars / 5) / timeElapsed) || 0;
        const accuracy = this.totalChars > 0 
            ? Math.round((this.correctChars / this.totalChars) * 100) 
            : 100;

        // 显示结果
        this.finalWpmElement.textContent = wpm;
        this.finalAccuracyElement.textContent = accuracy + '%';
        this.finalCharsElement.textContent = this.totalChars;
        this.finalErrorsElement.textContent = this.errors;

        this.showModal();
    }

    showModal() {
        this.resultModal.style.display = 'flex';
    }

    hideModal() {
        this.resultModal.style.display = 'none';
        this.startBtn.textContent = '开始练习';
        this.startBtn.disabled = false;
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new TypingGame();
});