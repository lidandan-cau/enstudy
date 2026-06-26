// pages/review/review.js
const STORAGE_KEY = 'enstudy_articles'
const MASTERY_KEY = 'enstudy_mastery'

function getMastery() {
  try { return wx.getStorageSync(MASTERY_KEY) || {} } catch (e) { return {} }
}

function isMastered(entry) {
  return entry && entry.known >= 2 && entry.known > entry.unknown
}

// 三分类：新词（未复习）/ 待加强（复习过但未达标）/ 已掌握
// 以 article.words 数组为词列表权威来源，从 rawContent 补充音标和释义
function extractAndCategorize(articles, mastery) {
  const newWords       = []
  const needsWorkWords = []
  const masteredWords  = []
  const seen  = new Set()
  const regex = /\[([^\]|]+)\|([^\]|]+)(?:\|([^\]]+))?\]/g

  articles.forEach(article => {
    // 先从 rawContent 建立 word → {phonetic, zh} 映射
    const infoMap = {}
    let match
    regex.lastIndex = 0
    while ((match = regex.exec(article.rawContent || '')) !== null) {
      const hasPhonetic = !!match[3]
      const en  = match[1].trim()
      infoMap[en.toLowerCase()] = {
        en,
        phonetic: hasPhonetic ? match[2].trim() : '',
        zh:       hasPhonetic ? match[3].trim() : match[2].trim(),
      }
    }

    // 以 article.words 为词表（AI 明确输出，不受正则格式影响）
    const wordList = article.words || []
    wordList.forEach(w => {
      const raw = typeof w === 'string' ? w : ''
      const key = raw.toLowerCase().trim()
      if (!key || seen.has(key)) return
      seen.add(key)

      const info = infoMap[key] || { en: raw, phonetic: '', zh: '' }
      const word  = { en: info.en, phonetic: info.phonetic, zh: info.zh, vocabBook: article.category || '' }
      const entry = mastery[key]
      if (!entry) {
        newWords.push(word)
      } else if (isMastered(entry)) {
        masteredWords.push(word)
      } else {
        needsWorkWords.push(word)
      }
    })
  })

  return { newWords, needsWorkWords, masteredWords }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

Page({
  data: {
    // 筛选标签
    selectedFilter:  'new',
    newCount:        0,
    needsWorkCount:  0,
    masteredCount:   0,
    hasWords:        false,
    // 复习卡片
    words:           [],
    total:           0,
    currentIndex:    0,
    currentWord:     null,
    revealed:        false,
    knownCount:      0,
    unknownCount:    0,
    // 'loading' | 'reviewing' | 'finished' | 'filterEmpty' | 'empty'
    status:          'loading',
    progressPercent: 0,
  },

  onShow() {
    this._init()
  },

  _init() {
    try {
      const articles = wx.getStorageSync(STORAGE_KEY) || []
      if (articles.length === 0) {
        this.setData({ status: 'empty', hasWords: false, newCount: 0, needsWorkCount: 0, masteredCount: 0 })
        return
      }

      const mastery = getMastery()
      const { newWords, needsWorkWords, masteredWords } = extractAndCategorize(articles, mastery)

      this._newWords       = newWords
      this._needsWorkWords = needsWorkWords
      this._masteredWords  = masteredWords

      const total = newWords.length + needsWorkWords.length + masteredWords.length
      this.setData({
        newCount:       newWords.length,
        needsWorkCount: needsWorkWords.length,
        masteredCount:  masteredWords.length,
        hasWords:       total > 0,
      })

      this._startReview(this.data.selectedFilter)
    } catch (e) {
      this.setData({ status: 'empty' })
    }
  },

  _startReview(filter) {
    let words = []
    if (filter === 'new')       words = this._newWords       || []
    else if (filter === 'needsWork') words = this._needsWorkWords || []
    else                             words = this._masteredWords  || []

    if (words.length === 0) {
      this.setData({ status: 'filterEmpty' })
      return
    }

    const shuffled = shuffle(words)
    this.setData({
      words:        shuffled,
      total:        shuffled.length,
      currentIndex: 0,
      knownCount:   0,
      unknownCount: 0,
      status:       'reviewing',
    })
    this._showCard(0)
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.selectedFilter) return
    this.setData({ selectedFilter: filter })
    this._startReview(filter)
  },

  _showCard(index) {
    const word     = this.data.words[index]
    const progress = Math.round((index / this.data.total) * 100)
    this.setData({ currentWord: word, currentIndex: index, revealed: false, progressPercent: progress })
  },

  onReveal() {
    if (!this.data.revealed) this.setData({ revealed: true })
  },

  onKnown() {
    if (!this.data.revealed) return
    this._saveMastery(this.data.currentWord, true)
    this._next(true)
  },

  onUnknown() {
    if (!this.data.revealed) return
    this._saveMastery(this.data.currentWord, false)
    this._next(false)
  },

  _saveMastery(word, known) {
    try {
      const mastery = wx.getStorageSync(MASTERY_KEY) || {}
      const key     = word.en.toLowerCase()
      const entry   = mastery[key] || { known: 0, unknown: 0, vocabBook: word.vocabBook || '' }
      if (known) { entry.known++ } else { entry.unknown++ }
      if (!entry.vocabBook) entry.vocabBook = word.vocabBook || ''
      mastery[key] = entry
      wx.setStorageSync(MASTERY_KEY, mastery)
    } catch (e) {}
  },

  _next(known) {
    const { currentIndex, total, knownCount, unknownCount } = this.data
    const newKnown   = knownCount   + (known ? 1 : 0)
    const newUnknown = unknownCount + (known ? 0 : 1)
    const nextIndex  = currentIndex + 1

    if (nextIndex >= total) {
      this.setData({ status: 'finished', knownCount: newKnown, unknownCount: newUnknown, progressPercent: 100 })
    } else {
      this.setData({ knownCount: newKnown, unknownCount: newUnknown })
      this._showCard(nextIndex)
    }
  },

  onRestart() {
    this._startReview(this.data.selectedFilter)
  },

  onGoRead() {
    wx.switchTab({ url: '/pages/index/index' })
  },
})
