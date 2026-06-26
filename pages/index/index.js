// pages/index/index.js
const app = getApp()
const ARTICLES_KEY = 'enstudy_articles'

const CATEGORIES = [
  { key: 'all',  label: '全部' },
  { key: 'KET',  label: 'KET' },
  { key: 'PET',  label: 'PET' },
  { key: 'CET4', label: '四级' },
  { key: 'CET6', label: '六级' },
  { key: 'GRE',  label: '考研' },
]

function getArticles() {
  try { return wx.getStorageSync(ARTICLES_KEY) || [] } catch (e) { return [] }
}

function makeDesc(rawContent) {
  const plain = (rawContent || '').replace(/\[([^\]|]+)\|[^\]]+\]/g, (_, en) => en)
  return plain.slice(0, 40) + (plain.length > 40 ? '...' : '')
}

Page({
  data: {
    categories: CATEGORIES,
    selectedCategory: 'all',
    allArticles: [],
    displayArticles: [],
    totalCount: 0,
    countBar: '',
  },

  onLoad() {
    this._loadArticles()
  },

  onShow() {
    this._loadArticles()
  },

  _loadArticles() {
    const list = getArticles().map(a => ({
      ...a,
      wordCount: (a.words || []).length || a.wordCount || 0,
      desc: makeDesc(a.rawContent),
    }))
    const countBar = this._buildCountBar(list)
    this.setData({ allArticles: list, totalCount: list.length, countBar })
    this._filter(this.data.selectedCategory)
  },

  _buildCountBar(list) {
    if (!list.length) return ''
    const bookMap = { KET: 'KET', PET: 'PET', CET4: '四级', CET6: '六级', GRE: '考研' }
    const counts = {}
    list.forEach(a => { if (a.category) counts[a.category] = (counts[a.category] || 0) + 1 })
    const parts = [`全部 ${list.length} 篇`]
    Object.keys(bookMap).forEach(key => {
      if (counts[key]) parts.push(`${bookMap[key]} ${counts[key]}`)
    })
    return parts.join('  ·  ')
  },

  _filter(category) {
    const { allArticles } = this.data
    const list = category === 'all' ? allArticles : allArticles.filter(a => a.category === category)
    this.setData({ displayArticles: list, selectedCategory: category })
  },

  onCategoryTap(e) {
    this._filter(e.currentTarget.dataset.key)
  },

  onArticleTap(e) {
    const article = this.data.displayArticles[e.currentTarget.dataset.index]
    app.globalData.currentArticle = article
    wx.navigateTo({ url: '/pages/article/article?source=library' })
  },

  onGoGenerate() {
    wx.navigateTo({ url: '/pages/generate/generate' })
  },
})
