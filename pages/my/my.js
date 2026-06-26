// pages/my/my.js
const ARTICLES_KEY = 'enstudy_articles'
const MASTERY_KEY  = 'enstudy_mastery'

const BOOKS = ['KET', 'PET', 'CET4', 'CET6', 'GRE']

function getArticles() {
  try { return wx.getStorageSync(ARTICLES_KEY) || [] } catch (e) { return [] }
}

function getMastery() {
  try { return wx.getStorageSync(MASTERY_KEY) || {} } catch (e) { return {} }
}

function calcLearningDays(articles) {
  if (!articles.length) return 0
  const oldest = Math.min(...articles.map(a => a.savedAt || Date.now()))
  return Math.max(1, Math.ceil((Date.now() - oldest) / 86400000))
}

function thisMonthCount(articles) {
  const now = new Date()
  return articles.filter(a => {
    const d = new Date(a.savedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
}

// 统一遍历文章库，以 article.words 数组为准（AI 明确输出的词表），保证四项数字完全一致
function calcAllWordStats(articles, mastery) {
  const seen            = new Set()
  const totalByBook     = {}
  const newByBook       = {}
  const masteredByBook  = {}
  const needsWorkByBook = {}
  let total = 0, newWords = 0, mastered = 0, needsWork = 0

  articles.forEach(a => {
    const book  = a.category || ''
    const words = a.words || []
    words.forEach(w => {
      const en = (typeof w === 'string' ? w : '').toLowerCase().trim()
      if (!en || seen.has(en)) return
      seen.add(en)
      total++
      totalByBook[book] = (totalByBook[book] || 0) + 1

      const entry = mastery[en]
      if (!entry) {
        newWords++
        newByBook[book] = (newByBook[book] || 0) + 1
      } else if (entry.known >= 2 && entry.known > entry.unknown) {
        mastered++
        masteredByBook[book] = (masteredByBook[book] || 0) + 1
      } else {
        needsWork++
        needsWorkByBook[book] = (needsWorkByBook[book] || 0) + 1
      }
    })
  })

  return { total, totalByBook, newWords, newByBook, mastered, masteredByBook, needsWork, needsWorkByBook }
}

// perLine: 每行最多显示几个词书，超出换行
function makeBreakdown(countsByBook, perLine) {
  const parts = BOOKS
    .filter(b => (countsByBook[b] || 0) > 0)
    .map(b => `${b} ${countsByBook[b]}`)
  if (!parts.length) return ''
  const lines = []
  for (let i = 0; i < parts.length; i += perLine) {
    lines.push(parts.slice(i, i + perLine).join(' · '))
  }
  return lines.join('\n')
}

Page({
  data: {
    learningDays:  0,
    totalArticles: 0,
    thisMonth:     0,
    totalWords:    0,
    totalWordsBreakdown: '',
    newWords:      0,
    newWordsBreakdown: '',
    mastered:      0,
    masteredBreakdown: '',
    needsWork:     0,
    needsWorkBreakdown: '',
    hasData:       false,
    hasReview:     false,
  },

  onLoad() {
    this._loadStats()
  },

  onShow() {
    this._loadStats()
  },

  _loadStats() {
    try {
      const articles = getArticles()
      const mastery  = getMastery()
      const hasData  = articles.length > 0
      const hasReview = Object.keys(mastery).length > 0

      const {
        total, totalByBook,
        newWords, newByBook,
        mastered, masteredByBook,
        needsWork, needsWorkByBook,
      } = calcAllWordStats(articles, mastery)

      this.setData({
        learningDays:        calcLearningDays(articles),
        totalArticles:       articles.length,
        thisMonth:           thisMonthCount(articles),
        totalWords:          total,
        totalWordsBreakdown: makeBreakdown(totalByBook, 3),
        newWords,
        newWordsBreakdown:   makeBreakdown(newByBook, 2),
        mastered,
        masteredBreakdown:   makeBreakdown(masteredByBook, 2),
        needsWork,
        needsWorkBreakdown:  makeBreakdown(needsWorkByBook, 2),
        hasData,
        hasReview,
      })
    } catch (e) {
      console.error('my _loadStats error:', e)
    }
  },

  onGoGenerate() {
    wx.navigateTo({ url: '/pages/generate/generate' })
  },

  onGoReview() {
    wx.switchTab({ url: '/pages/review/review' })
  },
})
