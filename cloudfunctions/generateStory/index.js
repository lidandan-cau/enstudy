// cloudfunctions/generateStory/index.js
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ----------------------------------------------------------------
// AI 接口配置
// 推荐使用 DeepSeek（国内可访问，性价比高）：https://platform.deepseek.com
// 也支持 OpenAI 兼容格式的其他服务（如 Moonshot/通义千问）
// ----------------------------------------------------------------
const AI_CONFIG = {
  host: 'api.deepseek.com',
  path: '/chat/completions',
  apiKey: 'YOUR_DEEPSEEK_API_KEY',  // 替换为你自己的 DeepSeek API Key
  model: 'deepseek-chat',
}

// 词书描述映射
const VOCAB_LEVEL_MAP = {
  KET:  'KET（剑桥A2级，初中生水平）',
  PET:  'PET（剑桥B1级，高中生水平）',
  CET4: '大学英语四级CET-4',
  CET6: '大学英语六级CET-6',
  GRE:  '考研英语',
}

// 故事长度映射（段落数匹配约1/2/3页的阅读量）
const LENGTH_MAP = {
  short:  { paragraphs: 6,  wordCount: 8  },
  medium: { paragraphs: 12, wordCount: 16 },
  long:   { paragraphs: 18, wordCount: 24 },
}

/**
 * 构建发给 AI 的 Prompt
 */
function buildPrompt({ vocabBook, storyType, storyLength, wordCount, usedWords }) {
  const level = VOCAB_LEVEL_MAP[vocabBook] || vocabBook
  const len = LENGTH_MAP[storyLength] || LENGTH_MAP.medium
  const type = storyType === '随机' ? '任意你觉得有趣的风格' : storyType

  const avoidLine = usedWords && usedWords.length > 0
    ? `\n⚠️ 以下词汇已在之前的故事中出现，本次绝对不得重复使用：${usedWords.join(', ')}\n`
    : ''

  return `你是一位专业的英语学习内容创作者。请严格按照下方要求创作一篇中英夹杂的学习短文。

【硬性规定，不得违反】
1. 正文必须恰好包含 ${len.paragraphs} 个自然段，每段之间用换行符 \\n 分隔
2. 全文必须恰好嵌入 ${wordCount} 个英文单词标注，每段至少分配 1 个
3. 每个英文单词必须用三段格式标注：[英文单词|IPA音标|中文释义]
   正确示例：[career|kəˈrɪr|事业]、[ancient|ˈeɪnʃənt|古老的]
   错误示例：[career|事业]（缺少音标，不可接受）
4. 除英文单词标注外，所有文字必须是中文${avoidLine}
【创作要求】
- 词汇难度：${level}，选取该级别真实常考核心词汇
- 故事风格：${type}
- 故事要连贯完整，情节吸引人，符合中国读者习惯
- 标题简洁有吸引力

【输出格式】
只输出一个合法 JSON 对象，不要有任何其他文字、markdown 代码块或解释：
{"title":"故事标题","content":"第一段内容\\n第二段内容\\n...","words":["word1","word2"]}

【完整示例（${len.paragraphs}段，含音标）】
{"title":"Story 1: 咖啡馆的秘密","content":"她推开那扇[ancient|ˈeɪnʃənt|古老的]木门，空气中弥漫着咖啡的香气。\\n角落里，一位老人正[concentrate|ˈkɒnsntreɪt|专注地]读着一本厚厚的书。\\n她[hesitate|ˈhezɪteɪt|犹豫]了片刻，还是走了过去。","words":["ancient","concentrate","hesitate"]}`
}

/**
 * 调用 AI 接口（原生 https，无需 npm 依赖）
 */
function callAI(prompt) {
  const body = JSON.stringify({
    model: AI_CONFIG.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 6000,
  })

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: AI_CONFIG.host,
        path: AI_CONFIG.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            const text = json.choices?.[0]?.message?.content || ''
            resolve(text)
          } catch (e) {
            reject(new Error('AI 响应解析失败'))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

exports.main = async (event) => {
  const { vocabBook, storyType, storyLength, wordCount, usedWords } = event

  if (!vocabBook) {
    return { success: false, error: '缺少词书参数' }
  }

  try {
    const prompt = buildPrompt({ vocabBook, storyType, storyLength, wordCount, usedWords })
    const aiText = await callAI(prompt)

    // 解析 AI 返回的 JSON
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 返回格式异常')

    const parsed = JSON.parse(jsonMatch[0])

    return {
      success: true,
      article: {
        id: `ai_${Date.now()}`,
        title: parsed.title || '未命名故事',
        rawContent: parsed.content || '',
        words: parsed.words || [],
        category: vocabBook,
        isGenerated: true,
      }
    }
  } catch (err) {
    console.error('generateStory error:', err)
    return { success: false, error: err.message || '生成失败' }
  }
}
