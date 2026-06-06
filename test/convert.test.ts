import { describe, expect, test } from "bun:test"
import { convertMarkdownToSlack } from "../src/convert"

describe("convertMarkdownToSlack", () => {
  test("converts the common Slack mrkdwn differences", () => {
    const markdown = [
      "# Release notes",
      "",
      "Hello **World** and *friends*.",
      "Use [Slack docs](https://docs.slack.dev/messaging/formatting-message-text/).",
      "~~old~~ `**literal**`",
      "- one",
      "- [x] shipped",
      "> quoted **thing**"
    ].join("\n")

    expect(convertMarkdownToSlack(markdown)).toBe([
      "*Release notes*",
      "",
      "Hello *World* and _friends_.",
      "Use <https://docs.slack.dev/messaging/formatting-message-text/|Slack docs>.",
      "~old~ `**literal**`",
      "• one",
      "☑ shipped",
      "> quoted *thing*"
    ].join("\n"))
  })

  test("preserves fenced code blocks", () => {
    const markdown = [
      "```ts",
      "const markdown = '**not bold here**'",
      "```"
    ].join("\n")

    expect(convertMarkdownToSlack(markdown)).toBe(markdown)
  })

  test("renders markdown tables as aligned code blocks", () => {
    const markdown = [
      "| name | status |",
      "| --- | --- |",
      "| cli | done |",
      "| docs | shipped |"
    ].join("\n")

    expect(convertMarkdownToSlack(markdown)).toBe([
      "```",
      "name  status",
      "cli   done",
      "docs  shipped",
      "```"
    ].join("\n"))
  })

  test("keeps pipes inside table code spans", () => {
    const markdown = [
      "| Markdown | Slack |",
      "| --- | --- |",
      "| `[label](https://example.com)` | `<https://example.com|label>` |"
    ].join("\n")

    expect(convertMarkdownToSlack(markdown)).toBe([
      "```",
      "Markdown                        Slack",
      "`[label](https://example.com)`  `<https://example.com|label>`",
      "```"
    ].join("\n"))
  })

  test("escapes Slack control characters outside protected links and code", () => {
    const markdown = "Tom & Jerry < raw > [safe & sound](https://example.com?a=1&b=2) `a < b`"

    expect(convertMarkdownToSlack(markdown)).toBe(
      "Tom &amp; Jerry &lt; raw &gt; <https://example.com?a=1&b=2|safe &amp; sound> `a < b`"
    )
  })
})
