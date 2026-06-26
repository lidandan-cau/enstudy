// pages/article/article.js
const app = getApp()

function parseContent(text) {
  const indented = '　　' + text.replace(/\n/g, '\n　　')

  const nodes = []
  const regex = /\[([^\]|]+)\|([^\]|]+)(?:\|([^\]]+))?\]/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(indented)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', content: indented.slice(lastIndex, match.index) })
    }
    const hasPhonetic = !!match[3]
    nodes.push({
      type: 'word',
      en:       match[1].trim(),
      phonetic: hasPhonetic ? match[2].trim() : '',
      zh:       hasPhonetic ? match[3].trim() : match[2].trim(),
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < indented.length) {
    nodes.push({ type: 'text', content: indented.slice(lastIndex) })
  }

  return nodes
}

const MOCK_ARTICLES = []

Page({
  data: {
    currentIndex: 0,
    displayMode: 'both',
    title: '',
    contentNodes: [],
    isStandalone: false,
    modeOptions: [
      { key: 'both', label: '中英' },
      { key: 'en',   label: '仅英文' },
      { key: 'zh',   label: '仅中文' }
    ]
  },

  onLoad(options) {
    if (options.source === 'generated' && app.globalData.generatedArticle) {
      this._applyArticle(app.globalData.generatedArticle)
    } else if (app.globalData.currentArticle) {
      this._applyArticle(app.globalData.currentArticle)
    } else {
      this._loadArticle(0)
    }
  },

  _applyArticle(article) {
    this.setData({
      title: article.title,
      contentNodes: parseContent(article.rawContent),
      isStandalone: true,
    })
  },

  _loadArticle(index) {
    const article = MOCK_ARTICLES[index]
    if (!article) return
    this.setData({
      currentIndex: index,
      title: article.title,
      contentNodes: parseContent(article.rawContent),
    })
  },

  onModeChange(e) {
    this.setData({ displayMode: e.currentTarget.dataset.mode })
  },

  onPrev() {
    const next = this.data.currentIndex - 1
    if (next < 0) { wx.showToast({ title: '已是第一篇', icon: 'none' }); return }
    this._loadArticle(next)
  },

  onNext() {
    const next = this.data.currentIndex + 1
    if (next >= MOCK_ARTICLES.length) { wx.showToast({ title: '已是最后一篇', icon: 'none' }); return }
    this._loadArticle(next)
  }
})
