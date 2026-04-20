# AI 日记 App MVP

一个本地优先、适合继续迭代的 Next.js MVP。当前版本已完成：

- 首页
- 今日记录页
- 历史记录页
- 总结页
- IndexedDB 本地保存
- 照片上传与本地展示
- 浏览器语音输入
- 天气自动识别
- AI 日记生成功能入口与服务端路由预留

## 目录结构

```text
diary-app/
├─ src/
│  ├─ app/
│  │  ├─ history/
│  │  ├─ summary/
│  │  ├─ today/
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ history/
│  │  ├─ home/
│  │  ├─ layout/
│  │  ├─ shared/
│  │  └─ today/
│  ├─ lib/
│  │  ├─ date.ts
│  │  ├─ diary-db.ts
│  │  └─ entry-utils.ts
│  └─ types/
│     └─ diary.ts
├─ package.json
└─ README.md
```

## 初始化命令

当前项目目录名包含空格和大写，`npm` 不能直接把根目录当作包名使用，所以应用代码放在了 `diary-app/` 子目录。

```bash
cd "/Users/ligen/Documents/Projects/03 Vibe Coding/03 Diary App/diary-app"
npm install
```

## 本地运行

```bash
cd "/Users/ligen/Documents/Projects/03 Vibe Coding/03 Diary App/diary-app"
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 当前实现说明

- 数据保存在浏览器 `IndexedDB`
- 每天记录默认按当天日期保存
- 当天已有记录时，今日页会自动加载已有内容
- 图片选择后会先做即时预览，再异步转成本地可持久化的数据
- 语音输入优先使用浏览器原生语音识别，不支持时可切换为录音后服务端转写
- 天气自动识别使用浏览器定位 + 本地天气路由代理 Open-Meteo

## AI 接入配置

如果你要启用语音转写能力，先复制环境变量：

```bash
cp .env.example .env.local
```

然后在 `.env.local` 里配置：

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-5-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

跨浏览器语音转写通过本地 Next.js 路由 `/api/ai/transcribe` 代理请求，不会把密钥暴露到浏览器里。

## 下一步建议

1. 增加设置页，把语言、天气自动识别开关、AI 风格偏好真正存起来
2. 如果以后需要，再把 AI 日记整理能力做成单独入口，而不是塞进每日记录页
3. 给总结页增加主题提取、重复困惑和最近最大进步
4. 为语音输入增加中断提示、权限引导和更好的移动端兼容
