import '../../styles/theme.css'
import './style.css'

type Difficulty = 'easy' | 'medium' | 'hard'
type Language = 'random' | 'english' | 'chinese'
type RealLanguage = 'english' | 'chinese'

interface DifficultyConfig {
    duration: number
    texts: Record<RealLanguage, string[]>
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
    easy: {
        duration: 60,
        texts: {
            english: [
                'The quick brown fox jumps over the lazy dog.',
                'A journey of a thousand miles begins with a single step.',
                'To be or not to be that is the question.',
                'All that glitters is not gold.',
                'Practice makes perfect.'
            ],
            chinese: [
                '千里之行，始于足下。',
                '学而时习之，不亦说乎。',
                '天行健，君子以自强不息。',
                '三人行，必有我师焉。',
                '温故而知新，可以为师矣。'
            ]
        }
    },
    medium: {
        duration: 90,
        texts: {
            english: [
                'The only way to do great work is to love what you do.',
                'Success is not final failure is not fatal it is the courage to continue that counts.',
                'In the middle of difficulty lies opportunity for growth and success.',
                'Life is what happens when you are busy making other plans.',
                'The greatest glory in living lies not in never falling but in rising every time we fall.'
            ],
            chinese: [
                '宝剑锋从磨砺出，梅花香自苦寒来。',
                '书山有路勤为径，学海无涯苦作舟。',
                '业精于勤荒于嬉，行成于思毁于随。',
                '路漫漫其修远兮，吾将上下而求索。',
                '不积跬步，无以至千里；不积小流，无以成江海。'
            ]
        }
    },
    hard: {
        duration: 120,
        texts: {
            english: [
                'Programming is thinking not typing unfortunately most programmers spend more time typing than thinking.',
                'The difference between ordinary and extraordinary is that little extra which makes all the difference in the world.',
                'Technology is best when it brings people together and helps them communicate more effectively and efficiently.',
                'The future belongs to those who believe in the beauty of their dreams and work hard to achieve them.',
                'Innovation distinguishes between a leader and a follower and drives progress forward in every field.'
            ],
            chinese: [
                '纸上得来终觉浅，绝知此事要躬行。问渠那得清如许，为有源头活水来。',
                '山重水复疑无路，柳暗花明又一村。众里寻他千百度，蓦然回首，那人却在灯火阑珊处。',
                '大鹏一日同风起，扶摇直上九万里。长风破浪会有时，直挂云帆济沧海。',
                '千磨万击还坚劲，任尔东西南北风。咬定青山不放松，立根原在破岩中。',
                '春蚕到死丝方尽，蜡炬成灰泪始干。晓镜但愁云鬓改，夜吟应觉月光寒。'
            ]
        }
    }
}

class TypingGame {
    private currentDifficulty: Difficulty = 'easy'
    private currentLanguage: Language = 'random'
    private targetText = ''
    private inputString = ''
    private isStarted = false
    private isFinished = false
    private isComposing = false
    private timeLeft = 60
    private timerInterval: number | null = null
    private elapsedSeconds = 0

    private readonly textDisplay: HTMLElement
    private readonly timerElement: HTMLElement
    private readonly wpmElement: HTMLElement
    private readonly accuracyElement: HTMLElement
    private readonly charsElement: HTMLElement
    private readonly startBtn: HTMLButtonElement
    private readonly hiddenInput: HTMLInputElement
    private readonly typingArea: HTMLElement
    private readonly typingHint: HTMLElement
    private readonly resultModal: HTMLElement
    private readonly finalWpmElement: HTMLElement
    private readonly finalAccuracyElement: HTMLElement
    private readonly finalCharsElement: HTMLElement
    private readonly finalErrorsElement: HTMLElement
    private readonly closeModalBtn: HTMLElement
    private readonly againBtn: HTMLElement
    private readonly difficultyBtns: NodeListOf<HTMLButtonElement>
    private readonly languageBtns: NodeListOf<HTMLButtonElement>

    constructor() {
        this.textDisplay = document.getElementById('text-display')!
        this.timerElement = document.getElementById('timer')!
        this.wpmElement = document.getElementById('wpm')!
        this.accuracyElement = document.getElementById('accuracy')!
        this.charsElement = document.getElementById('chars')!
        this.startBtn = document.getElementById('start-btn') as HTMLButtonElement
        this.hiddenInput = document.getElementById('hidden-input') as HTMLInputElement
        this.typingArea = document.getElementById('typing-area')!
        this.typingHint = document.getElementById('typing-hint')!
        this.resultModal = document.getElementById('result-modal')!
        this.finalWpmElement = document.getElementById('final-wpm')!
        this.finalAccuracyElement = document.getElementById('final-accuracy')!
        this.finalCharsElement = document.getElementById('final-chars')!
        this.finalErrorsElement = document.getElementById('final-errors')!
        this.closeModalBtn = document.getElementById('close-modal-btn')!
        this.againBtn = document.getElementById('again-btn')!
        this.difficultyBtns = document.querySelectorAll<HTMLButtonElement>('#difficulty-selector .ui-segment__item')
        this.languageBtns = document.querySelectorAll<HTMLButtonElement>('#language-selector .ui-segment__item')

        this.init()
    }

    private init(): void {
        this.setupEventListeners()
        this.resetGame()
    }

    private setupEventListeners(): void {
        this.startBtn.addEventListener('click', () => this.startGame())
        this.againBtn.addEventListener('click', () => {
            this.hideModal()
            this.resetGame()
            this.startGame()
        })
        this.closeModalBtn.addEventListener('click', () => {
            this.hideModal()
            this.resetGame()
        })

        this.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDifficulty = (btn.dataset.difficulty as Difficulty) ?? 'easy'
                this.difficultyBtns.forEach(b => b.classList.remove('is-active'))
                btn.classList.add('is-active')
                this.resetGame()
            })
        })

        this.languageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentLanguage = (btn.dataset.language as Language) ?? 'random'
                this.languageBtns.forEach(b => b.classList.remove('is-active'))
                btn.classList.add('is-active')
                this.resetGame()
            })
        })

        // 点击文本区域 → 聚焦隐藏 input
        this.typingArea.addEventListener('click', () => {
            if (!this.isFinished) this.hiddenInput.focus()
        })

        // 输入事件（包含英文直接输入和中文 IME 提交）
        this.hiddenInput.addEventListener('input', () => {
            if (this.isComposing) return
            this.handleInput()
        })

        // IME 组合输入
        this.hiddenInput.addEventListener('compositionstart', () => {
            this.isComposing = true
        })

        this.hiddenInput.addEventListener('compositionend', () => {
            this.isComposing = false
            // 延迟一帧，等 input 事件同步 value
            requestAnimationFrame(() => this.handleInput())
        })

        // 聚焦时若未开始，直接开始
        this.hiddenInput.addEventListener('focus', () => {
            if (!this.isStarted && !this.isFinished && this.targetText) {
                // 不自动开始，用户需点按钮
            }
        })

        // 全局键盘：点击任意位置后聚焦
        document.addEventListener('keydown', e => {
            if (e.key === 'Tab' || e.key === 'Escape') return
            if (document.activeElement !== this.hiddenInput && !this.isFinished) {
                this.hiddenInput.focus()
            }
        })
    }

    private resetGame(): void {
        this.stopTimer()
        this.isStarted = false
        this.isFinished = false
        this.inputString = ''
        this.elapsedSeconds = 0
        this.hiddenInput.value = ''
        this.hiddenInput.blur()

        const config = DIFFICULTIES[this.currentDifficulty]
        this.timeLeft = config.duration

        let availableTexts: string[]
        if (this.currentLanguage === 'random') {
            const lang: RealLanguage = Math.random() < 0.5 ? 'english' : 'chinese'
            availableTexts = config.texts[lang]
        } else {
            availableTexts = config.texts[this.currentLanguage]
        }
        this.targetText = availableTexts[Math.floor(Math.random() * availableTexts.length)]

        this.startBtn.disabled = false
        this.startBtn.textContent = '开始'
        this.typingHint.textContent = '点击文本区域开始输入'

        this.render()
        this.updateStats()
        this.hideModal()
    }

    private startGame(): void {
        if (this.isStarted || this.isFinished) return

        this.isStarted = true
        this.isFinished = false
        this.elapsedSeconds = 0
        this.inputString = ''
        this.hiddenInput.value = ''

        this.startBtn.disabled = true
        this.startBtn.textContent = '进行中'
        this.typingHint.textContent = '现在开始输入！'

        this.startTimer()
        this.render()
        this.updateStats()
        this.hiddenInput.focus()
    }

    private startTimer(): void {
        this.timerInterval = window.setInterval(() => {
            this.elapsedSeconds++
            this.timeLeft = DIFFICULTIES[this.currentDifficulty].duration - this.elapsedSeconds
            if (this.timeLeft <= 0) {
                this.timeLeft = 0
                this.updateStats()
                this.endGame()
                return
            }
            this.updateStats()
        }, 1000)
    }

    private stopTimer(): void {
        if (this.timerInterval !== null) {
            clearInterval(this.timerInterval)
            this.timerInterval = null
        }
    }

    private handleInput(): void {
        if (!this.isStarted || this.isFinished) return

        let typed = this.hiddenInput.value

        // 限制长度不超过目标文本
        if (typed.length > this.targetText.length) {
            typed = typed.slice(0, this.targetText.length)
            this.hiddenInput.value = typed
        }

        this.inputString = typed
        this.render()
        this.updateStats()

        if (this.inputString.length >= this.targetText.length) {
            this.endGame()
        }
    }

    private render(): void {
        this.textDisplay.innerHTML = ''
        const fragment = document.createDocumentFragment()

        for (let i = 0; i < this.targetText.length; i++) {
            const char = this.targetText[i]
            const span = document.createElement('span')
            span.className = 'char'

            // 换行/空格处理
            if (char === ' ') {
                span.textContent = '\u00A0'
            } else {
                span.textContent = char
            }

            if (i < this.inputString.length) {
                if (this.inputString[i] === char) {
                    span.classList.add('correct')
                } else {
                    span.classList.add('incorrect')
                }
            } else if (i === this.inputString.length && this.isStarted && !this.isFinished) {
                span.classList.add('current')
            } else {
                span.classList.add('pending')
            }

            fragment.appendChild(span)
        }

        this.textDisplay.appendChild(fragment)
    }

    private getCorrectCount(): number {
        let correct = 0
        for (let i = 0; i < this.inputString.length; i++) {
            if (this.inputString[i] === this.targetText[i]) correct++
        }
        return correct
    }

    private getErrorCount(): number {
        let errors = 0
        for (let i = 0; i < this.inputString.length; i++) {
            if (this.inputString[i] !== this.targetText[i]) errors++
        }
        return errors
    }

    private updateStats(): void {
        this.timerElement.textContent = String(this.timeLeft)
        this.charsElement.textContent = String(this.inputString.length)

        const correct = this.getCorrectCount()
        const errors = this.getErrorCount()
        const total = this.inputString.length

        // WPM：仅在实际已开始后计算
        if (this.isStarted && this.elapsedSeconds > 0) {
            const minutes = this.elapsedSeconds / 60
            const wpm = Math.round(correct / 5 / minutes)
            this.wpmElement.textContent = String(wpm)
        } else {
            this.wpmElement.textContent = '0'
        }

        // 准确率：正确数 / 总数
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100
        this.accuracyElement.textContent = `${accuracy}%`
        void errors
    }

    private endGame(): void {
        if (this.isFinished) return

        this.isFinished = true
        this.isStarted = false
        this.stopTimer()
        this.hiddenInput.blur()

        const correct = this.getCorrectCount()
        const errors = this.getErrorCount()
        const total = this.inputString.length

        // 用实际用时算 WPM；若为 0 秒，用 1 秒兜底
        const elapsed = Math.max(this.elapsedSeconds, 1) / 60
        const wpm = Math.round(correct / 5 / elapsed)
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100

        this.finalWpmElement.textContent = String(wpm)
        this.finalAccuracyElement.textContent = `${accuracy}%`
        this.finalCharsElement.textContent = String(total)
        this.finalErrorsElement.textContent = String(errors)

        this.startBtn.disabled = false
        this.startBtn.textContent = '重新开始'
        this.typingHint.textContent = '练习完成，点击"开始"再来一次'

        this.showModal()
    }

    private showModal(): void {
        this.resultModal.classList.add('is-open')
    }

    private hideModal(): void {
        this.resultModal.classList.remove('is-open')
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TypingGame()
})