export interface ConvertOptions {
  readonly bullet?: "dot" | "dash"
}

const FENCE_RE = /^\s*(```|~~~)/
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/
const ATX_HEADING_RE = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/
const SETEXT_HEADING_RE = /^\s{0,3}(=+|-+)\s*$/
const TASK_RE = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/
const UNORDERED_RE = /^(\s*)[-*+]\s+(.*)$/
const ORDERED_RE = /^(\s*)(\d+[.)])\s+(.*)$/
const BLOCKQUOTE_RE = /^(\s*>+\s?)(.*)$/

export function convertMarkdownToSlack(markdown: string, options: ConvertOptions = {}): string {
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.split("\n")
  const output: Array<string> = []
  let inFence = false
  let fenceMarker: "```" | "~~~" | undefined

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    const fence = line.match(FENCE_RE)?.[1] as "```" | "~~~" | undefined

    if (fence) {
      if (!inFence) {
        inFence = true
        fenceMarker = fence
      } else if (fence === fenceMarker) {
        inFence = false
        fenceMarker = undefined
      }
      output.push(line)
      continue
    }

    if (inFence) {
      output.push(line)
      continue
    }

    if (isTableStart(lines, index)) {
      const table = collectTable(lines, index)
      output.push(formatTable(table.rows))
      index = table.nextIndex - 1
      continue
    }

    const next = lines[index + 1]
    if (next && SETEXT_HEADING_RE.test(next) && line.trim().length > 0) {
      output.push(`*${convertInline(line.trim())}*`)
      index += 1
      continue
    }

    output.push(convertLine(line, options))
  }

  return output.join("\n")
}

function convertLine(line: string, options: ConvertOptions): string {
  if (line.trim().length === 0) return ""
  if (HR_RE.test(line)) return "────────"

  const heading = line.match(ATX_HEADING_RE)
  if (heading) return `*${convertInline(heading[2] ?? "")}*`

  const quote = line.match(BLOCKQUOTE_RE)
  if (quote) return `${quote[1] ?? "> "}${convertInline(quote[2] ?? "")}`

  const task = line.match(TASK_RE)
  if (task) {
    const checked = /x/i.test(task[2] ?? "") ? "☑" : "☐"
    return `${task[1] ?? ""}${checked} ${convertInline(task[3] ?? "")}`
  }

  const unordered = line.match(UNORDERED_RE)
  if (unordered) {
    const marker = options.bullet === "dash" ? "-" : "•"
    return `${unordered[1] ?? ""}${marker} ${convertInline(unordered[2] ?? "")}`
  }

  const ordered = line.match(ORDERED_RE)
  if (ordered) return `${ordered[1] ?? ""}${ordered[2] ?? "1."} ${convertInline(ordered[3] ?? "")}`

  return convertInline(line)
}

export function convertInline(input: string): string {
  const tokens: Array<string> = []
  const protect = (value: string): string => {
    const token = `\uE000${tokens.length}\uE001`
    tokens.push(value)
    return token
  }

  let text = input

  text = text.replace(/`([^`\n]+)`/g, (match) => protect(match))
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, alt: string, url: string) =>
    protect(formatSlackLink(url, alt || url))
  )
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, label: string, url: string) =>
    protect(formatSlackLink(url, label))
  )

  text = escapeSlackText(text)
  text = text.replace(/\*\*([^*\n]+)\*\*/g, (_match, value: string) => protect(`*${value}*`))
  text = text.replace(/__([^_\n]+)__/g, (_match, value: string) => protect(`*${value}*`))
  text = text.replace(/~~([^~\n]+)~~/g, (_match, value: string) => protect(`~${value}~`))
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, (_match, value: string) => protect(`_${value}_`))
  text = text.replace(/(?<![\w])_([^_\n]+)_(?![\w])/g, (_match, value: string) => protect(`_${value}_`))

  return restoreTokens(text, tokens)
}

function restoreTokens(text: string, tokens: ReadonlyArray<string>): string {
  let result = text
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    result = result.replaceAll(`\uE000${index}\uE001`, tokens[index] ?? "")
  }
  return result
}

function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeSlackLabel(text: string): string {
  return escapeSlackText(text).replace(/\|/g, "¦")
}

function formatSlackLink(rawUrl: string, rawLabel: string): string {
  const url = sanitizeSlackUrl(rawUrl)
  const label = escapeSlackLabel(rawLabel.trim())
  return label.length > 0 && label !== url ? `<${url}|${label}>` : `<${url}>`
}

function sanitizeSlackUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/^</, "")
    .replace(/>$/, "")
    .replace(/\|/g, "%7C")
    .replace(/>/g, "%3E")
}

function isTableStart(lines: ReadonlyArray<string>, index: number): boolean {
  const current = lines[index]
  const next = lines[index + 1]
  return Boolean(current && next && current.includes("|") && isTableSeparator(next))
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function collectTable(lines: ReadonlyArray<string>, startIndex: number): { readonly rows: Array<Array<string>>; readonly nextIndex: number } {
  const rows: Array<Array<string>> = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index] ?? ""
    if (line.trim().length === 0 || !line.includes("|")) break
    if (!isTableSeparator(line)) rows.push(splitTableRow(line))
    index += 1
  }

  return { rows, nextIndex: index }
}

function splitTableRow(line: string): Array<string> {
  const trimmed = stripOuterPipes(line.trim())
  const cells: Array<string> = []
  let cell = ""
  let inCode = false
  let escaped = false

  for (const char of trimmed) {
    if (escaped) {
      cell += char
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = true
      cell += char
      continue
    }

    if (char === "`") inCode = !inCode

    if (char === "|" && !inCode) {
      cells.push(cell.trim().replace(/\\\|/g, "|"))
      cell = ""
      continue
    }

    cell += char
  }

  cells.push(cell.trim().replace(/\\\|/g, "|"))
  return cells
}

function stripOuterPipes(line: string): string {
  let result = line
  if (result.startsWith("|")) result = result.slice(1)
  if (result.endsWith("|") && !result.endsWith("\\|")) result = result.slice(0, -1)
  return result
}

function formatTable(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  if (rows.length === 0) return ""

  const columnCount = Math.max(...rows.map((row) => row.length))
  const widths = Array.from({ length: columnCount }, (_unused, columnIndex) =>
    Math.max(...rows.map((row) => visibleLength(row[columnIndex] ?? "")))
  )

  const formattedRows = rows.map((row) =>
    Array.from({ length: columnCount }, (_unused, columnIndex) => padCell(row[columnIndex] ?? "", widths[columnIndex] ?? 0)).join("  ").trimEnd()
  )

  return ["```", ...formattedRows, "```"].join("\n")
}

function visibleLength(value: string): number {
  return value.length
}

function padCell(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - visibleLength(value)))}`
}
