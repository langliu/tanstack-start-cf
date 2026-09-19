---
name: tailwindcss-v4
description: 规范化编写与迁移 Tailwind CSS v4 语法。消除 v3 遗留语法与警告（如 text-[var(--accent)] -> text-(--accent)、border-[var(--line)] -> border-(--line)、!h-11 -> h-11!、aspect-[4/5] -> aspect-4/5、size-[32px] -> size-8、data-[size=sm]:w-[24px] -> data-[size=sm]:w-6、max-h-[34rem] -> max-h-136、sm:order-none -> sm:order-0、废弃工具类等），提供自动化转换脚本、@theme 配置指引与代码审查规范。用于处理 Tailwind CSS v4 警告、编写符合 v4 规范的代码或进行批量代码库迁移。
---

# Tailwind CSS v4 规范与迁移指南

Tailwind CSS v4 引入了全新基于原生 CSS 的引擎，极大地简化了 CSS 变量的消费语法，重构了 `!important` 修饰符为后缀，原生支持了分数纵横比工具类，提供了**动态连续间距刻度（rem/px 动态计算）**，规范了布局重置类（如 `order-0`），并废弃了部分冗长的 v3 写法。

本 Skill 用于：
1. **消除编译器/编辑器警告**：
   - `The class text-[var(--accent-strong)] can be written as text-(--accent-strong)`
   - `The class !h-11 can be written as h-11!`
   - `The class aspect-[4/5] can be written as aspect-4/5`
   - `The class size-[32px] can be written as size-8`
   - `The class data-[size=sm]:w-[24px] can be written as data-[size=sm]:w-6`
   - `The class max-h-[34rem] can be written as max-h-136`
   - `The class sm:order-none can be written as sm:order-0`
2. **规范化编写** Tailwind CSS v4 样式；
3. **自动化批量迁移** 项目中的 v3 遗留类名与不规范写法。

---

## 核心语法变更与对照表

### 1. CSS 变量简写（核心改动）

在 Tailwind CSS v4 中，**所有消费 CSS 变量的工具类均推荐使用括号简写 `prefix-(--var-name)`**，而不再需要冗长的 `[var(--var-name)]` 语法。

| 类别 | v3 遗留写法（会触发警告） | v4 规范写法 |
| :--- | :--- | :--- |
| **文本颜色** | `text-[var(--sea-ink)]` | `text-(--sea-ink)` |
| **背景颜色** | `bg-[var(--surface-strong)]` | `bg-(--surface-strong)` |
| **边框颜色/宽度** | `border-[var(--line)]` | `border-(--line)` |
| **圆角** | `rounded-[var(--radius)]` | `rounded-(--radius)` |
| **外间距 / 内边距** | `p-[var(--padding)]` / `m-[var(--gap)]` | `p-(--padding)` / `m-(--gap)` |
| **Flex 间隙** | `gap-[var(--gutter)]` | `gap-(--gutter)` |
| **尺寸** | `w-[var(--sidebar-w)]` / `h-[var(--header-h)]` | `w-(--sidebar-w)` / `h-(--header-h)` |
| **等宽高等高** | `size-[var(--avatar-size)]` | `size-(--avatar-size)` |
| **定位偏移** | `top-[var(--nav-height)]` | `top-(--nav-height)` |
| **轮廓与光晕** | `ring-[var(--accent)]` / `outline-[var(--focus)]` | `ring-(--accent)` / `outline-(--focus)` |
| **阴影** | `shadow-[var(--elevation-1)]` | `shadow-(--elevation-1)` |
| **带透明度修饰符** | `bg-[var(--accent-strong)]/50` | `bg-(--accent-strong)/50` |
| **带变体前缀** | `hover:text-[var(--accent)]` | `hover:text-(--accent)` |

> [!TIP]
> **保留方括号的例外情况**：只有当值是**非 CSS 变量且无原生动态解析的任意值**（如具体数值 `min-h-[60svh]`、`text-[0.68rem]`、`grid-cols-[1fr_auto]`、自定义颜色值 `bg-[#ff0000]`）时，才继续使用方括号 `[...]`。

---

### 2. 标准尺寸与间距刻度简写（包含 rem/px 动态计算）

Tailwind CSS v4 拥有全新的**动态线性间距系统**：间距刻度定义为 $1 = 0.25\text{rem} = 4\text{px}$。
因此，任何 rem 表达（$\text{scale} = \text{rem} \times 4$）或像素表达（$\text{scale} = \text{px} / 4$），**均无需使用方括号 `[Nrem]` / `[Npx]`，直接写作对应的数值刻度**：

| 任意值写法（会触发警告） | v4 规范写法 | 换算原理（$1 = 0.25\text{rem} = 4\text{px}$） |
| :--- | :--- | :--- |
| `max-h-[34rem]` | `max-h-136` | $34 \times 4 = 136$ |
| `w-[20rem]` / `h-[20rem]` | `w-80` / `h-80` | $20 \times 4 = 80$ |
| `min-h-[10rem]` | `min-h-40` | $10 \times 4 = 40$ |
| `size-[32px]` | `size-8` | $32 / 4 = 8$ (2rem) |
| `w-[24px]` / `h-[24px]` | `w-6` / `h-6` | $24 / 4 = 6$ (1.5rem) |
| `data-[size=sm]:w-[24px]` | `data-[size=sm]:w-6` | 带变体时同样适用动态刻度 |
| `data-[size=default]:w-[32px]` | `data-[size=default]:w-8` | 带变体时同样适用动态刻度 |
| `data-[size=sm]:h-[14px]` | `data-[size=sm]:h-3.5` | $14 / 4 = 3.5$ (0.875rem) |
| `p-[16px]` / `m-[16px]` | `p-4` / `m-4` | $16 / 4 = 4$ (1rem) |
| `gap-[12px]` | `gap-3` | $12 / 4 = 3$ (0.75rem) |
| `top-[8px]` / `inset-[8px]` | `top-2` / `inset-2` | $8 / 4 = 2$ (0.5rem) |

---

### 3. 纵横比（Aspect Ratio）分数简写（核心改动）

在 Tailwind CSS v4 中，**宽高比原生支持任意分数 `aspect-a/b`**，不再需要用方括号包裹：

| v3 遗留写法（会触发警告） | v4 规范写法 | 说明 |
| :--- | :--- | :--- |
| `aspect-[4/5]` | `aspect-4/5` | 原生动态分数解析 |
| `aspect-[4/3]` | `aspect-4/3` | 原生动态分数解析 |
| `aspect-[3/4]` | `aspect-3/4` | 原生动态分数解析 |
| `aspect-[16/9]` | `aspect-16/9` | 原生动态分数解析（也可使用 `aspect-video`） |
| `aspect-[1/1]` | `aspect-1/1` | 原生动态分数解析（也可使用 `aspect-square`） |
| `aspect-[9/16]` | `aspect-9/16` | 原生动态分数解析 |

---

### 4. Important 修饰符由前缀变为后缀（核心改动）

在 Tailwind CSS v4 中，**`!important` 修饰符由前缀 `!` 移到了类名末尾 `!`**。前缀写法虽然可能仍被部分解析，但会触发编译与编辑器警告。

| 场景 | v3 遗留写法（会触发警告） | v4 规范写法 | 说明 |
| :--- | :--- | :--- | :--- |
| **基础类名** | `!h-11` | `h-11!` | `!` 移到末尾 |
| **字体/排版** | `!font-bold` / `!text-white` | `font-bold!` / `text-white!` | 移到末尾 |
| **显示状态** | `!hidden` / `!block` / `!flex` | `hidden!` / `block!` / `flex!` | 移到末尾 |
| **内外边距** | `!p-0` / `!m-auto` | `p-0!` / `m-auto!` | 移到末尾 |
| **带伪类/响应式变体** | `hover:!bg-blue-500` / `!hover:bg-blue-500` | `hover:bg-blue-500!` | 变体在最前，`!` 在工具类最末尾 |
| **带 CSS 变量简写** | `!bg-(--surface-muted)` | `bg-(--surface-muted)!` | 括号后接 `!` |

---

### 5. 常用工具类重命名与废弃项

Tailwind CSS v4 简化并统一了部分工具类命名规范：

| v3 废弃写法（会触发警告） | v4 推荐写法 | 说明 |
| :--- | :--- | :--- |
| `order-none` / `sm:order-none` | `order-0` / `sm:order-0` | 统一为数值顺序归零 |
| `flex-shrink-0` | `shrink-0` | 统一简化前缀 |
| `flex-shrink` | `shrink` | 统一简化前缀 |
| `flex-grow-0` | `grow-0` | 统一简化前缀 |
| `flex-grow` | `grow` | 统一简化前缀 |
| `overflow-ellipsis` | `text-ellipsis` | 规范文本截断命名 |
| `decoration-slice` | `box-decoration-slice` | 规范盒装饰命名 |

---

### 6. 配置方式与主题定义（@theme）

Tailwind v4 不再使用 `tailwind.config.js`，全部在主 CSS 文件中通过原生指令声明：

```css
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --font-sans: 'Inter Variable', sans-serif;
}
```

引用自定义主题变量时，可以直接使用 `bg-primary`（若在 `@theme` 中声明）或 `bg-(--custom-var)`（引用外部原生 CSS 变量）。

---

## 自动化迁移工具

本项目内置了一键自动化扫描与替换脚本，位于本 Skill 目录中：

### 1. 扫描与预览变更（Dry-Run）
```bash
node .agents/skills/tailwindcss-v4/scripts/migrate-v3-to-v4.mjs
```
该命令会列出项目中所有包含 `[var(--x)]`、`aspect-[a/b]`、`size-[32px]`、`max-h-[34rem]`、`order-none`、前缀 `!utility` 以及废弃工具类的文件和修改计数，但不会写入文件。

### 2. 执行批量替换并写回（Write）
```bash
node .agents/skills/tailwindcss-v4/scripts/migrate-v3-to-v4.mjs --write
```
会自动将：
- `[var(--variable)]` 替换为 `(--variable)`
- `aspect-[a/b]` 替换为 `aspect-a/b`
- `prefix-[Nrem]` 替换为 `prefix-(N * 4)`（如 `max-h-[34rem]` $\rightarrow$ `max-h-136`）
- `prefix-[Npx]`（在间距刻度上时）替换为 `prefix-scale`（如 `size-[32px]` $\rightarrow$ `size-8`、`data-[size=sm]:w-[24px]` $\rightarrow$ `data-[size=sm]:w-6`）
- `order-none`（包含变体如 `sm:order-none`）替换为 `order-0`（如 `sm:order-0`）
- `!utility` / `hover:!utility` 替换为 `utility!` / `hover:utility!`
- `flex-shrink-0` 等替换为 `shrink-0`

### 3. 指定扫描目录
```bash
node .agents/skills/tailwindcss-v4/scripts/migrate-v3-to-v4.mjs --write --dir=src/components
```

---

## 编写与审查代码时的 CheckList

当审查或新增组件样式时，确认以下检查项：

- [ ] **无 `[var(--*)]` 模式**：所有 CSS 变量工具类均使用 `(--*)`，例如 `border-(--line)`、`text-(--sea-ink)`。
- [ ] **顺序重置使用 `order-0`**：使用 `order-0`、`sm:order-0`，严禁使用 `order-none`、`sm:order-none`。
- [ ] **rem 尺寸转换为动态刻度**：使用 `rem * 4` 动态刻度，如 `max-h-136`（严禁使用 `max-h-[34rem]`）、`w-80`（严禁使用 `w-[20rem]`）。
- [ ] **标准尺寸优先使用刻度**：命中刻度的像素写法使用标准类名，如 `size-8`（严禁使用 `size-[32px]`）、`data-[size=sm]:w-6`（严禁使用 `data-[size=sm]:w-[24px]`）、`h-3.5`。
- [ ] **纵横比使用原生分数**：使用 `aspect-4/5`、`aspect-4/3`、`aspect-16/9`，严禁使用 `aspect-[4/5]`。
- [ ] **Important 修饰符居于末尾**：使用 `h-11!`、`font-bold!`，严禁使用前缀 `!h-11`、`!font-bold`。
- [ ] **带变体的 Important 语法**：变体在前，修饰符在后，如 `hover:bg-blue-500!`，而非 `hover:!bg-blue-500`。
- [ ] **无过时 Flex 伸缩类**：使用 `shrink-0` 而非 `flex-shrink-0`；使用 `grow` 而非 `flex-grow`。
- [ ] **等宽高简写**：当宽高相等时使用 `size-*`（如 `size-5`、`size-(--icon-size)`），而非 `w-* h-*`。
- [ ] **非变量任意值保留方括号**：如 `min-h-[60svh]`、`text-[13px]` 正确保留 `[...]`。
- [ ] **透明度修饰符语法正确**：支持 `text-(--accent)/80`、`bg-(--surface)/50`。
