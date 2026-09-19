#!/usr/bin/env node

/**
 * Tailwind CSS v3 -> v4 语法自动化迁移脚本
 *
 * 功能：
 * 1. 将 CSS 变量简写：`[var(--name)]` -> `(--name)`
 *    例如：`text-[var(--accent-strong)]` -> `text-(--accent-strong)`
 *         `border-[var(--line)]` -> `border-(--line)`
 *         `bg-[var(--accent)]/50` -> `bg-(--accent)/50`
 * 2. 纵横比分数简写：`aspect-[a/b]` -> `aspect-a/b`
 *    例如：`aspect-[4/5]` -> `aspect-4/5`
 *         `aspect-[4/3]` -> `aspect-4/3`
 *         `aspect-[16/9]` -> `aspect-16/9`
 * 3. 标准间距/尺寸简写：
 *    - 像素转刻度：`size-[32px]` -> `size-8`, `w-[24px]` -> `w-6`
 *    - rem 转动态刻度 (scale = rem * 4)：`max-h-[34rem]` -> `max-h-136`, `w-[20rem]` -> `w-80`
 * 4. 将 Important 修饰符由前缀转为后缀：`!utility` -> `utility!`
 *    例如：`!h-11` -> `h-11!`
 *         `hover:!bg-red-500` -> `hover:bg-red-500!`
 *         `!font-bold` -> `font-bold!`
 * 5. 替换 v3 遗留工具类：
 *    - `order-none` -> `order-0`
 *    - `flex-shrink-0` -> `shrink-0`
 *    - `flex-shrink` -> `shrink`
 *    - `flex-grow-0` -> `grow-0`
 *    - `flex-grow` -> `grow`
 *    - `overflow-ellipsis` -> `text-ellipsis`
 *
 * 用法：
 *   node scripts/migrate-v3-to-v4.mjs [--write] [--dir=src]
 */

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const isWrite = args.includes('--write')
const targetDirArg = args.find((arg) => arg.startsWith('--dir='))
const targetDir = targetDirArg ? targetDirArg.split('=')[1] : 'src'

const EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js', '.html', '.css', '.vue', '.svelte'])

// 标准 Tailwind 间距像素对应表
const SPACING_SCALE_PX = {
  '0px': '0',
  '1px': 'px',
  '2px': '0.5',
  '4px': '1',
  '6px': '1.5',
  '8px': '2',
  '10px': '2.5',
  '12px': '3',
  '14px': '3.5',
  '16px': '4',
  '20px': '5',
  '24px': '6',
  '28px': '7',
  '32px': '8',
  '36px': '9',
  '40px': '10',
  '44px': '11',
  '48px': '12',
  '56px': '14',
  '64px': '16',
  '72px': '18',
  '80px': '20',
  '96px': '24',
  '112px': '28',
  '128px': '32',
}

// 基础正则替换规则列表
const REPLACEMENTS = [
  // 1. CSS 变量任意值转 v4 简写语法：[var(--variable-name)] -> (--variable-name)
  {
    pattern: /\[var\((--[\w-]+)\)\]/g,
    replace: '($1)',
    description: 'CSS 变量简写 [var(--x)] -> (--x)',
  },
  // 2. 纵横比分数简写：aspect-[a/b] -> aspect-a/b
  {
    pattern: /aspect-\[(\d+\/\d+)\]/g,
    replace: 'aspect-$1',
    description: '纵横比分数简写 aspect-[a/b] -> aspect-a/b',
  },
  // 3. order-none -> order-0
  {
    pattern: /(?<=\s|^|'|"|`|:)order-none(?=\s|$|'|"|`)/g,
    replace: 'order-0',
    description: 'order-none -> order-0',
  },
  // 4. 常见的 v3 废弃工具类
  {
    pattern: /(?<=\s|^|'|"|`|:)flex-shrink-0(?=\s|$|'|"|`)/g,
    replace: 'shrink-0',
    description: 'flex-shrink-0 -> shrink-0',
  },
  {
    pattern: /(?<=\s|^|'|"|`|:)flex-shrink(?=\s|$|'|"|`)/g,
    replace: 'shrink',
    description: 'flex-shrink -> shrink',
  },
  {
    pattern: /(?<=\s|^|'|"|`|:)flex-grow-0(?=\s|$|'|"|`)/g,
    replace: 'grow-0',
    description: 'flex-grow-0 -> grow-0',
  },
  {
    pattern: /(?<=\s|^|'|"|`|:)flex-grow(?=\s|$|'|"|`)/g,
    replace: 'grow',
    description: 'flex-grow -> grow',
  },
  {
    pattern: /(?<=\s|^|'|"|`|:)overflow-ellipsis(?=\s|$|'|"|`)/g,
    replace: 'text-ellipsis',
    description: 'overflow-ellipsis -> text-ellipsis',
  },
]

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        walkDir(fullPath, fileList)
      }
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

// 转换命中标准间距刻度的像素任意值，例如 size-[32px] -> size-8, w-[24px] -> w-6
function transformPixelSpacing(content) {
  let count = 0
  const spacingPattern = /(?<=\s|^|'|"|`|:)(size|w|h|min-w|min-h|max-w|max-h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|inset|inset-x|inset-y|top|bottom|left|right)-\[(\d+px)\](?=\s|$|'|"|`)/g

  const updated = content.replace(spacingPattern, (match, prefix, px) => {
    if (SPACING_SCALE_PX[px]) {
      count++
      return `${prefix}-${SPACING_SCALE_PX[px]}`
    }
    return match
  })

  return { updated, count }
}

// 转换 rem 间距到 Tailwind v4 动态间距刻度 (scale = rem * 4)，例如 max-h-[34rem] -> max-h-136
function transformRemSpacing(content) {
  let count = 0
  const remPattern = /(?<=\s|^|'|"|`|:)(size|w|h|min-w|min-h|max-w|max-h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|inset|inset-x|inset-y|top|bottom|left|right)-\[(\d+(?:\.\d+)?)rem\](?=\s|$|'|"|`)/g

  const updated = content.replace(remPattern, (match, prefix, remStr) => {
    const rem = parseFloat(remStr)
    const scale = rem * 4
    if (Number.isInteger(scale) || scale % 0.5 === 0) {
      count++
      return `${prefix}-${scale}`
    }
    return match
  })

  return { updated, count }
}

// 针对 className / class / cn / clsx 中的 !important 前缀修饰符进行转换
function transformImportantModifier(content) {
  let count = 0
  // 匹配 class/className 属性字符串以及 cn/clsx/cva 字符串参数
  const classStringPattern = /(className\s*=\s*['"`]|class\s*=\s*['"`]|(?:cn|clsx|cva)\s*\([^)]*?['"`])([^'"`]+)(['"`])/gs
  const importantClassPattern = /(?<=\s|^)(?:([a-zA-Z0-9-]+:)*)!([a-zA-Z0-9-]+(?:\([^)]*\)|\[[^\]]*\])?)(?=\s|$)/g

  let updated = content.replace(classStringPattern, (match, prefix, classString, quote) => {
    const transformed = classString.replace(importantClassPattern, (m, variants = '', utility) => {
      count++
      return `${variants || ''}${utility}!`
    })
    return `${prefix}${transformed}${quote}`
  })

  // CSS 文件中的 @apply !utility
  const applyPattern = /(@apply\s+)([^;]+)(;)/g
  updated = updated.replace(applyPattern, (match, prefix, classString, suffix) => {
    const transformed = classString.replace(importantClassPattern, (m, variants = '', utility) => {
      count++
      return `${variants || ''}${utility}!`
    })
    return `${prefix}${transformed}${suffix}`
  })

  return { updated, count }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  let updated = content
  const changes = []

  // 1. 基础正则替换
  for (const { pattern, replace, description } of REPLACEMENTS) {
    const matches = updated.match(pattern)
    if (matches) {
      changes.push({ description, count: matches.length })
      updated = updated.replace(pattern, replace)
    }
  }

  // 2. 像素间距转标准工具类: size-[32px] -> size-8
  const spacingResult = transformPixelSpacing(updated)
  if (spacingResult.count > 0) {
    changes.push({
      description: '像素间距简写 [Npx] -> 预设工具类 (如 size-[32px] -> size-8)',
      count: spacingResult.count,
    })
    updated = spacingResult.updated
  }

  // 3. rem 间距转动态刻度工具类: max-h-[34rem] -> max-h-136
  const remResult = transformRemSpacing(updated)
  if (remResult.count > 0) {
    changes.push({
      description: 'rem 间距简写 [Nrem] -> 动态刻度 (如 max-h-[34rem] -> max-h-136)',
      count: remResult.count,
    })
    updated = remResult.updated
  }

  // 4. Important 修饰符转换: !utility -> utility!
  const importantResult = transformImportantModifier(updated)
  if (importantResult.count > 0) {
    changes.push({
      description: 'Important 修饰符 !utility -> utility!',
      count: importantResult.count,
    })
    updated = importantResult.updated
  }

  if (updated !== content) {
    return {
      filePath,
      changes,
      newContent: updated,
    }
  }
  return null
}

function main() {
  const root = process.cwd()
  const scanPath = path.resolve(root, targetDir)

  console.log(`\n🔍 开始扫描目录: ${scanPath}`)
  console.log(`模式: ${isWrite ? '✍️ 写入模式 (--write)' : '👀 预览模式 (Dry Run)'}\n`)

  const files = walkDir(scanPath)
  let totalFilesChanged = 0
  let totalReplacements = 0

  for (const file of files) {
    const result = processFile(file)
    if (result) {
      totalFilesChanged++
      const relPath = path.relative(root, file)
      console.log(`📄 ${relPath}`)
      for (const change of result.changes) {
        totalReplacements += change.count
        console.log(`   - ${change.description}: ${change.count} 处`)
      }

      if (isWrite) {
        fs.writeFileSync(file, result.newContent, 'utf8')
      }
    }
  }

  console.log('\n----------------------------------------')
  if (totalFilesChanged === 0) {
    console.log('✅ 未发现需要迁移的 Tailwind CSS v3 语法！代码库符合 v4 规范。')
  } else {
    console.log(`📊 统计: 共发现 ${totalFilesChanged} 个文件，${totalReplacements} 处需要转换。`)
    if (!isWrite) {
      console.log('💡 提示: 请执行添加 `--write` 参数应用修改：')
      console.log('   node .agents/skills/tailwindcss-v4/scripts/migrate-v3-to-v4.mjs --write\n')
    } else {
      console.log('🎉 所有改动已成功写回文件！\n')
    }
  }
}

main()
