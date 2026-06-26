// pages/generate/generate.js
const app = getApp()

// 词书配置（所有词书使用统一的词数标准）
const VOCAB_OPTIONS = [
  { key: 'KET',  label: 'KET',  sub: 'A2级',  wordCount: { short: 8, medium: 16, long: 24 } },
  { key: 'PET',  label: 'PET',  sub: 'B1级',  wordCount: { short: 8, medium: 16, long: 24 } },
  { key: 'CET4', label: '四级', sub: 'CET-4', wordCount: { short: 8, medium: 16, long: 24 } },
  { key: 'CET6', label: '六级', sub: 'CET-6', wordCount: { short: 8, medium: 16, long: 24 } },
  { key: 'GRE',  label: '考研', sub: '研究生', wordCount: { short: 8, medium: 16, long: 24 } },
]

// 故事风格
const STORY_TYPES = [
  { key: 'fantasy',  label: '玄幻修仙', icon: '🔮' },
  { key: 'urban',    label: '都市生活', icon: '🏙️' },
  { key: 'scifi',    label: '科幻未来', icon: '🚀' },
  { key: 'history',  label: '历史穿越', icon: '⏳' },
  { key: 'fairy',    label: '童话故事', icon: '🧚' },
  { key: 'mystery',  label: '悬疑推理', icon: '🔍' },
]

// 故事长度
const LENGTH_OPTIONS = [
  { key: 'short',  label: '短篇', desc: '8词 · 约1页' },
  { key: 'medium', label: '中篇', desc: '16词 · 约2页' },
  { key: 'long',   label: '长篇', desc: '24词 · 约3页' },
]

// 预计阅读时长
const READ_TIME = { short: 2, medium: 4, long: 6 }

Page({
  data: {
    vocabOptions: VOCAB_OPTIONS,
    storyTypes: STORY_TYPES,
    lengthOptions: LENGTH_OPTIONS,
    selectedVocab: '',
    selectedVocabObj: null,
    selectedType: '',
    selectedLength: 'medium',
    generating: false,
    // 动态预览信息
    previewWordCount: 0,
    previewReadTime: 0,
    previewVocabLabel: '',
  },

  // ---- 选择词书 ----
  onVocabSelect(e) {
    const key = e.currentTarget.dataset.key
    const vocab = VOCAB_OPTIONS.find(v => v.key === key)
    const wc = vocab.wordCount[this.data.selectedLength]
    this.setData({
      selectedVocab: key,
      selectedVocabObj: vocab,
      previewWordCount: wc,
      previewReadTime: READ_TIME[this.data.selectedLength],
      previewVocabLabel: vocab.label,
    })
  },

  // ---- 选择风格（再次点击取消选中 → 随机）----
  onTypeSelect(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ selectedType: this.data.selectedType === key ? '' : key })
  },

  // ---- 选择长度 ----
  onLengthSelect(e) {
    const key = e.currentTarget.dataset.key
    const vocab = this.data.selectedVocabObj
    const wc = vocab ? vocab.wordCount[key] : 0
    this.setData({
      selectedLength: key,
      previewWordCount: wc,
      previewReadTime: READ_TIME[key],
    })
  },

  // ---- 开始生成 ----
  // 读取所有词书已用过的词（去重），传给云函数避免重复
  // 跨词书也排除，确保新文章的每个词都是用户从未在任何文章中见过的
  _getUsedWords() {
    try {
      const list = wx.getStorageSync('enstudy_articles') || []
      const seen = new Set()
      list.forEach(a => (a.words || []).forEach(w => seen.add(w.toLowerCase())))
      return [...seen]
    } catch (e) { return [] }
  },

  async onGenerate() {
    if (!this.data.selectedVocab || this.data.generating) return

    this.setData({ generating: true })

    try {
      const typeLabel = this.data.selectedType
        ? STORY_TYPES.find(t => t.key === this.data.selectedType).label
        : '随机'

      const usedWords = this._getUsedWords()

      const res = await wx.cloud.callFunction({
        name: 'generateStory',
        data: {
          vocabBook:   this.data.selectedVocab,
          storyType:   typeLabel,
          storyLength: this.data.selectedLength,
          wordCount:   this.data.previewWordCount,
          usedWords,
        }
      })

      if (res.result && res.result.success) {
        const article = res.result.article
        // 保存到本地文章库，首页可以看到
        try {
          const list = wx.getStorageSync('enstudy_articles') || []
          list.unshift({ ...article, savedAt: Date.now() })
          wx.setStorageSync('enstudy_articles', list)
        } catch (e) {}
        // 跳转阅读
        app.globalData.generatedArticle = article
        wx.navigateTo({ url: '/pages/article/article?source=generated' })
      } else {
        wx.showToast({ title: res.result?.error || '生成失败，请重试', icon: 'none' })
      }
    } catch (err) {
      console.error('generateStory error:', err)
      wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    } finally {
      this.setData({ generating: false })
    }
  },
})
