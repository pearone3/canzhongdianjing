# 喰种电竞 - 报单管理系统

专业陪玩店报单管理系统，基于 Supabase + 原生 HTML/CSS/JS 构建，支持打手报单、店长审核、数据统计、公告管理等功能。

## 功能特性

### 打手端
- 📊 **个人仪表盘** - 查看个人报单数据、绩效统计、最新公告
- 📝 **提交报单** - 填写订单信息并提交审核
- 📈 **我的绩效** - 历史报单记录、趋势图表、收入统计

### 店长端
- 📊 **总览面板** - 全店数据概览、打手排行榜、趋势分析
- 📋 **报单管理** - 审核所有报单、查看历史记录、筛选查询
- 📢 **公告管理** - 发布、编辑、删除系统公告
- 👥 **打手管理** - 查看打手列表、管理打手信息
- ⚙️ **系统设置** - 修改注册密钥等系统配置

### 公共区域
- 🏠 **公共首页** - 全店数据展示、排行榜、最新公告
- 📢 **公告列表** - 查看所有历史公告

## 技术栈

- **前端**：原生 HTML5 + CSS3 + JavaScript (ES6+)
- **后端/BaaS**：Supabase (PostgreSQL + Auth + Storage)
- **图表**：Chart.js 4.x
- **样式**：自定义深色商务主题

## 目录结构

```
报单网站/
├── index.html                      # 入口：判断登录状态，跳转对应主页
├── login.html                      # 登录注册界面（打手/管理员共用）
├── README.md                       # 项目说明文档
├── assets/
│   ├── style.css                   # 全局样式（严肃高级风格）
│   ├── supabase-client.js          # Supabase 初始化 + 公共工具函数
│   └── chart-init.js               # Chart.js 通用配置 + 数据渲染函数
└── pages/
    ├── public/                     # 公共区域（无需登录）
    │   ├── index.html              # 公共首页
    │   └── announcements.html      # 公告列表页
    ├── player/                     # 打手私人主页
    │   ├── dashboard.html          # 打手仪表盘
    │   ├── report.html             # 报单页面
    │   └── performance.html        # 我的绩效
    └── manager/                    # 店长模式主页
        ├── dashboard.html          # 店长总览
        ├── reports.html            # 所有报单管理
        ├── announcements.html      # 公告管理
        ├── players.html            # 打手管理
        └── settings.html           # 系统设置
```

## 部署前配置

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册并创建新项目
2. 在项目设置中获取 `Project URL` 和 `anon public key`

### 2. 配置 Supabase 客户端

编辑 `assets/supabase-client.js`，替换以下配置：

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',      // 替换为你的 Project URL
    anonKey: 'your-anon-key'                       // 替换为你的 anon key
};
```

### 3. 创建数据库表

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 报单表
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES auth.users(id) NOT NULL,
    player_name TEXT,
    game_name TEXT,
    order_type TEXT,
    amount NUMERIC(10,2),
    duration TEXT,
    customer_note TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 公告表
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 系统设置表
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化注册密钥
INSERT INTO settings (key, value) VALUES ('registration_key', 'your-secret-key')
ON CONFLICT (key) DO NOTHING;

-- 开启 RLS（行级安全）- 根据需要配置策略
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
```

### 4. 设置管理员角色

在 Supabase Auth 中找到管理员用户，在其 `user_metadata` 中添加：
```json
{ "role": "manager", "nickname": "店长昵称" }
```

## 使用说明

### 打手注册
1. 访问登录页，切换到「注册」标签
2. 填写昵称、邮箱、密码
3. 输入店长提供的注册密钥
4. 提交注册后即可登录

### 店长审核
1. 使用管理员账号登录
2. 进入「报单管理」页面
3. 对待审核报单进行通过/驳回操作

## 部署方式

### 静态托管（推荐）
- Vercel / Netlify / Cloudflare Pages
- 直接上传整个文件夹即可

### 本地运行
```bash
# 使用任意静态服务器
npx serve .
# 或
python -m http.server 8080
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 自定义配置

### 修改主题颜色
编辑 `assets/style.css` 中的 `:root` 变量：
```css
:root {
    --accent-primary: #c9a961;   /* 主色调 */
    --accent-secondary: #8b6f3e; /* 辅助色 */
    --bg-primary: #0a0e17;       /* 背景色 */
}
```

### 修改报单字段
编辑 `pages/player/report.html` 中的表单，以及 `supabase-client.js` 中的 `createReport` 函数。

## 注意事项

1. **注册密钥**：首次部署后请及时在「系统设置」中修改默认注册密钥
2. **数据安全**：建议配置 Supabase RLS 策略，确保用户只能访问自己的数据
3. **邮箱验证**：可在 Supabase Auth 设置中开启邮箱验证
4. **备份数据**：定期在 Supabase 中导出数据库备份

## 许可证

内部使用，版权所有 © 喰种电竞
