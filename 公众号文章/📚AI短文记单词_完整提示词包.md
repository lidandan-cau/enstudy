# 📚 AI短文记单词 完整 AI 提示词包（28条）

> 本文档收录了从零搭建「AI短文记单词」微信小程序的完整提示词。
> 技术栈：微信原生小程序（JS）+ 微信云开发 + AI API
> 复制粘贴给 AI（Claude / GPT / Cursor 均可），可直接使用。

---

## 一、项目初始化

### 提示词 01：项目架构规划
```
我要做一个微信小程序，名字叫「AI短文记单词」，功能如下：
- 用 AI 生成包含指定词书生词的英文短篇故事
- 故事里的生词用 [英文|音标|中文] 格式标注
- 用户可以阅读故事、点击生词查看释义
- 支持单词复习（翻卡片 + 认识/不认识）
- 追踪每个词的掌握程度

技术要求：
- 微信原生小程序（JavaScript）
- 微信云开发（云函数调用 AI API）
- 数据存本地（wx.setStorageSync）

请帮我规划项目的完整文件结构清单，不写代码，只列出需要哪些文件和它们的职责。
```

### 提示词 02：app.json 配置
```
帮我写 app.json，配置如下：

页面：
- pages/index/index（阅读首页，tabBar）
- pages/review/review（复习页，tabBar）
- pages/my/my（我的，tabBar）
- pages/article/article（文章阅读页，非tabBar）
- pages/generate/generate（生成故事页，非tabBar）

tabBar：
- 3个标签：阅读 / 复习 / 我的
- 选中颜色：#3CAB6E
- 图标路径：/assets/icons/ 目录

全局样式：
- 导航栏白色背景，黑色文字
- 页面背景色：#F7F8FA
```

---

## 二、云函数（核心）

### 提示词 03：云函数结构设计
```
帮我写微信云函数 generateStory/index.js 的完整代码：

接收参数（event 对象）：
- vocabBook: string（KET/PET/CET4/CET6/GRE）
- storyType: string（故事风格，如"玄幻修仙"）
- storyLength: string（short/medium/long）
- wordCount: number（7/12/24）
- usedWords: string[]（已用过的词，需排除）

核心逻辑：
1. 构建给 AI 的 prompt（见提示词04）
2. 用 node-fetch 调用 AI API（接口地址和 key 从环境变量读取）
3. 解析 AI 返回的 JSON
4. 返回 { success: true, article: { title, rawContent, words, category } }
   或 { success: false, error: '...' }

config.json 设置 timeout: 60
package.json 添加 node-fetch 依赖
```

### 提示词 04：给 AI 的故事生成 Prompt
```
帮我写发给 AI 的故事生成 prompt 模板（写死在云函数里的系统提示词）：

要求：
1. 指定词书级别和故事风格
2. 明确生词数量
3. 格式要求非常严格：每个生词必须用 [英文单词|音标|中文释义] 嵌入句子，
   例如：The [ancient|/ˈeɪnʃənt/|古老的] temple stood on the hill.
4. 不允许在文章末尾另外列词汇表
5. 不使用 usedWords 列表里的任何单词
6. 返回严格的 JSON 格式：
   { "title": "故事标题", "content": "故事正文（含格式化生词）", "words": ["word1","word2",...] }
7. words 数组只包含小写单词字符串，不含音标和中文

给我写这个 prompt 模板的字符串，用模板字面量（支持变量插入）。
```

### 提示词 05：云函数错误处理
```
帮我优化 generateStory 云函数的错误处理：

1. AI API 调用超时（设置 fetch 的 timeout 为55秒）
2. AI 返回的 JSON 解析失败（提供 fallback 处理）
3. AI 返回的格式不符合预期（words 数组为空、content 里没有 [...|...|...] 格式）
4. 网络错误
5. 每种错误返回友好的中文错误提示

另外，加入请求日志（云函数 console.log），方便在云开发控制台调试。
```

### 提示词 06：云函数本地调试
```
帮我写一个 generateStory 云函数的本地测试脚本 test.js：
- 直接调用 index.js 导出的函数（不走微信云函数环境）
- 用真实的 AI API key 测试（从 .env 文件读取）
- 输出完整的 AI 返回结果和解析后的 article 对象
- 测试用例：四级词书 + 玄幻修仙 + 中篇
```

---

## 三、生成页

### 提示词 07：生成页 WXML
```
帮我写 pages/generate/generate.wxml：

布局从上到下：
1. 词书选择区域（标题「选择词书」+ 5个卡片：KET/PET/四级/六级/考研）
   每个卡片显示：大标签 + 小副标题（A2级/B1级/CET-4/CET-6/研究生）
2. 故事风格区域（标题「选择风格」+ 6个格子：玄幻修仙🔮/都市生活🏙️/科幻未来🚀/历史穿越⏳/童话故事🧚/悬疑推理🔍）
   每格可再次点击取消（取消=随机）
3. 长度选择区域（3个按钮：短篇7词约1页/中篇12词约2页/长篇24词约3页）
4. 预览信息区（约X个生词 · 约X分钟阅读）
5. 「开始生成」大按钮（词书未选时置灰）
6. 生成中 loading 蒙层（generating 为 true 时显示，三个点跳动动画）
```

### 提示词 08：生成页 JS
```
帮我写 pages/generate/generate.js：

数据：
- vocabOptions、storyTypes、lengthOptions（硬编码配置）
- selectedVocab、selectedType、selectedLength、generating
- previewWordCount、previewReadTime

逻辑：
- onVocabSelect：选词书，更新预览信息
- onTypeSelect：选风格，再次点击取消（变随机）
- onLengthSelect：选长度，更新预览词数和阅读时长
- onGenerate：
  1. 从本地所有文章提取 usedWords 去重
  2. 调用云函数 generateStory
  3. 成功后 unshift 到 enstudy_articles 存储
  4. 跳转 /pages/article/article?source=generated
```

### 提示词 09：生成页 WXSS
```
帮我写 pages/generate/generate.wxss：

主色：#3CAB6E（绿色）
背景：#F7F8FA
词书卡片：白色圆角卡片，选中时绿色边框 + 浅绿背景 + 绿色文字
风格格子：2行3列网格，选中时绿色背景 + 白色文字
长度按钮：横排三等分，选中态同上
生成按钮：全宽，圆角，绿色背景，白色大字；置灰时灰色背景
loading 蒙层：半透明白色背景，中间白色卡片 + 三点动画
三点动画用 keyframe animation：三个点依次上下跳动
```

---

## 四、阅读页

### 提示词 10：生词格式解析函数
```
帮我写 parseContent(rawContent) 函数：

输入：包含 [英文|音标|中文] 格式的故事字符串
输出：节点数组，每个节点是 {type: 'text', content: '...'} 或 {type: 'word', en, phonetic, zh}

处理逻辑：
- 用正则 /\[([^\]|]+)\|([^\]|]+)(?:\|([^\]]+))?\]/g 匹配
- 格式1：[word|phonetic|zh]（三段，有音标）
- 格式2：[word|zh]（两段，无音标）
- 故事首行增加两个全角空格缩进（段首缩进）
- 换行符后也加缩进

这个函数会在 article.js 里使用。
```

### 提示词 11：阅读页 WXML
```
帮我写 pages/article/article.wxml：

顶部：
- 文章标题（大字）
- 显示模式切换 Tab：中英 / 仅英文 / 仅中文

正文区域（scroll-view，可滚动）：
- 用 <rich-text> 或 wx:for 循环渲染 contentNodes
- type='text' 的节点：普通文字
- type='word' 的节点：带绿色下划线高亮，bindtap=onWordTap

生词释义弹窗（底部弹出，half-sheet 样式）：
- 显示 en（大字）/ phonetic（灰色小字）/ zh（中等字）
- 关闭按钮 + 点击蒙层关闭
- 条件渲染：showPopup 为 true 时展示
```

### 提示词 12：阅读页 JS
```
帮我写 pages/article/article.js：

数据：
- title, contentNodes, displayMode（both/en/zh）
- showPopup, popupWord（当前弹窗词）
- isStandalone（从生成跳来=true，从文章列表来=false）

生命周期：
- onLoad(options)：
  - source=generated：从 app.globalData.generatedArticle 读取
  - source=library：从 app.globalData.currentArticle 读取

方法：
- _applyArticle(article)：调用 parseContent，设置 contentNodes
- onModeChange(e)：切换显示模式
- onWordTap(e)：设置 popupWord，showPopup=true
- onClosePopup：showPopup=false
```

---

## 五、复习页

### 提示词 13：掌握度分类逻辑
```
帮我写 extractAndCategorize(articles, mastery) 函数：

输入：
- articles：文章数组（每篇有 rawContent 和 words 字段）
- mastery：掌握度对象 { [wordKey]: { known, unknown, vocabBook } }

处理逻辑：
1. 遍历所有文章，用正则从 rawContent 提取 {en, phonetic, zh} 映射
2. 以 article.words 数组为权威词表（AI 明确输出的词列表）
3. 去重（全局去重，同一词只出现一次）
4. 三分类：
   - newWords：mastery 里没有记录
   - needsWorkWords：有记录但未达到 isMastered 标准
   - masteredWords：known >= 2 && known > unknown

返回 { newWords, needsWorkWords, masteredWords }
```

### 提示词 14：复习页 WXML
```
帮我写 pages/review/review.wxml：

状态 status 控制显示：

'empty' 状态：提示「还没有文章，去生成一篇吧」+ 去生成按钮
'loading' 状态：加载动画
'filterEmpty' 状态：提示当前分类没有单词
'reviewing' 状态：
  - 顶部：进度条（当前/总数）+ 认识/不认识计数
  - 中间：卡片区域（正面英文大字，背面音标+中文，翻转动画）
  - 底部：翻转前「点击翻转」按钮，翻转后「认识✓」「不认识✗」按钮
'finished' 状态：本轮结果（认识X个/不认识X个）+ 再来一轮 + 去阅读

顶部分类 Tab：新词(N) / 待加强(N) / 已掌握(N)
```

### 提示词 15：复习页 JS（完整）
```
帮我写 pages/review/review.js 的完整代码，包含：

数据状态：selectedFilter, newCount, needsWorkCount, masteredCount, hasWords,
         words, total, currentIndex, currentWord, revealed,
         knownCount, unknownCount, status, progressPercent

onShow 时调用 _init()
_init()：读取 enstudy_articles 和 enstudy_mastery，调用 extractAndCategorize，
        更新三类词的数量，调用 _startReview(selectedFilter)

_startReview(filter)：取对应词列表，shuffle 打乱，设置状态为 reviewing

_showCard(index)：设置 currentWord，更新进度百分比，revealed=false

onReveal：翻转卡片，revealed=true
onKnown / onUnknown：调用 _saveMastery，调用 _next
_saveMastery(word, known)：更新 enstudy_mastery 存储
_next(known)：更新计数，如果是最后一张则 status=finished，否则 _showCard(nextIndex)

onFilterChange：切换分类重新开始复习
onRestart：重新开始当前分类
onGoRead：switchTab 到阅读页
```

---

## 六、首页和我的

### 提示词 16：首页文章列表
```
帮我写 pages/index/index.js 和对应的 WXML：

功能：
- 顶部分类筛选 Tab：全部 / KET / PET / 四级 / 六级 / 考研
- 文章列表（倒序，最新的在最上面）：
  每条显示：文章标题、词书标签（彩色小标签）、生词数量、日期
- 空状态：提示「还没有文章，点击右上角生成第一篇」
- 右上角「+」按钮跳转生成页
- 计数 bar：「全部 N 篇 · KET 3 · 四级 5」

数据来源：wx.getStorageSync('enstudy_articles')
onShow 时刷新（每次从生成页回来都要刷新）
```

### 提示词 17：「我的」页面
```
帮我写 pages/my/my.js 和对应 WXML：

展示数据（从 enstudy_articles 和 enstudy_mastery 计算）：
- 累计阅读篇数
- 已掌握单词数
- 待加强单词数
- 累计接触词汇总数

词书进度（每个词书生成了多少篇 + 掌握了多少词）：
KET / PET / 四级 / 六级 / 考研 分别展示

清空数据按钮（二次确认弹窗，清空所有文章和掌握度数据）

设计风格：卡片式布局，绿色主色调 #3CAB6E
```

---

## 七、样式系统

### 提示词 18：全局样式 app.wxss
```
帮我写 app.wxss 全局样式变量和基础样式：

CSS 变量：
--primary: #3CAB6E（绿色）
--primary-light: #E8F8EF
--text-primary: #1A1A1A
--text-secondary: #666666
--text-hint: #AAAAAA
--bg-page: #F7F8FA
--bg-card: #FFFFFF
--border-color: #EEEEEE
--radius-card: 12px

基础样式：
- page 默认背景色
- 通用卡片样式 .card（白色圆角阴影）
- 通用标签样式 .tag（小圆角，颜色可通过 class 变体区分词书）
```

### 提示词 19：卡片翻转 CSS 动画
```
帮我实现复习卡片的翻转 CSS 动画（3D flip）：

要求：
- 用 CSS transform: rotateY() 实现翻转效果
- 翻转时长：0.3s
- 正面（英文）显示 rotateY(0deg)，背面（中文）显示 rotateY(180deg)
- 使用 backface-visibility: hidden 防止背面穿透
- 在微信小程序里兼容（用 transform 不用 WebKit 前缀也可以）
- wx:if 控制正反面显示时，配合 animation class 实现过渡
```

---

## 八、功能扩展

### 提示词 20：批量生成功能
```
帮我在生成页加一个「批量生成」功能：
- 新增一个「数量」选项：1篇/3篇/5篇
- 选择多篇时，点生成后依次调用云函数（串行，不并行避免超时）
- 每篇生成完显示进度：「正在生成 2/3...」
- 全部完成后跳转首页（不是阅读页）
- 其中某篇失败时：提示「第X篇生成失败，已跳过」，继续生成其余
```

### 提示词 21：单词收藏功能
```
帮我在阅读页加单词收藏功能：
- 点击生词弹窗里的「收藏」按钮，将该词加入收藏列表
- 存储 key：enstudy_favorites，格式同 mastery
- 在复习页加第四个 Tab「收藏」，专门复习收藏的词
- 收藏的词在阅读页高亮颜色不同（金色而非绿色）
- 可以取消收藏
```

### 提示词 22：学习统计图表
```
帮我在「我的」页面加一个近7天学习趋势图：
- 横轴：最近7天日期
- 纵轴：当天新增掌握词数
- 用原生 canvas 绘制折线图（不引入第三方库）
- 颜色用主色 #3CAB6E
- 没有数据的日期显示为0
```

### 提示词 23：故事难度自适应
```
帮我实现故事难度自适应逻辑：
- 记录用户最近20次复习中「认识」的比率
- 比率 > 80%：下次生成时自动建议提升词书级别
- 比率 < 40%：建议降低词书级别或缩短故事长度
- 在生成页顶部显示「建议」横幅（可关闭）：「根据你的复习数据，建议尝试六级词书」
```

---

## 九、调试和优化

### 提示词 24：云函数调试技巧
```
我的云函数 generateStory 在某些情况下 AI 返回的格式不对（words 数组为空、
content 里没有 [word|...] 格式标注）。

帮我在云函数里加入格式校验：
1. 检查 JSON 是否能正确解析
2. 检查 content 里是否含有至少一个 [word|...] 格式
3. 检查 words 数组长度是否接近 wordCount（允许±2个误差）
4. 如果校验失败，重试一次（最多2次），仍然失败则返回 error

同时，在日志里打印 AI 原始返回内容，方便排查。
```

### 提示词 25：常见报错修复
```
我的小程序运行时出现以下报错：
[粘贴报错信息]

帮我分析原因并给出修复方案，提供修改后的代码片段。
```

---

## 十、上线准备

### 提示词 26：隐私协议和权限
```
我的「AI短文记单词」小程序使用了本地存储，不需要登录，不上传用户数据。
帮我检查以下合规要求：
1. app.json 里是否需要声明什么权限
2. 是否需要用户协议和隐私政策页面
3. 提交审核时「功能描述」怎么写（不会被驳回的写法）
4. 是否需要备案
```

### 提示词 27：上线前完整检查清单
```
帮我生成一份微信小程序上线前的完整检查清单，针对「AI短文记单词」这类：
- 有云函数的小程序
- 不需要用户登录
- 数据存本地
- 调用第三方 AI API

分类列出：功能测试 / 性能 / 安全 / 合规 / 审核材料
```

### 提示词 28：云函数费用预估
```
我的「AI短文记单词」小程序，预计每天有100个用户，每人生成2篇故事。
每次调用 AI API 大约消耗 800 tokens（输入+输出）。

帮我估算：
1. 每月微信云函数的费用（按调用次数 + 执行时间计费）
2. AI API 的费用（按 token 计费）
3. 如何优化降低费用（缓存、批量、prompt 压缩等）
```

---

*以上28条提示词覆盖「AI短文记单词」从0到上线的完整开发流程。*
*技术栈：微信原生小程序（JS）+ 微信云开发*
