# slackdown

Tiny Bun + Effect CLI for turning regular Markdown into Slack `mrkdwn`, so you can copy/paste into Slack without the usual busted `**bold**` and `[links](url)` mess.

Built after David Wells asked for a markdown-to-Slack copy/paste converter.

## Install

```sh
bun install -g github:joelhooks/slackdown
```

Then run:

```sh
slackdown README.md --copy
```

Or pipe markdown in:

```sh
cat release-notes.md | slackdown --copy
```

Without `--copy`, output is printed to stdout:

```sh
slackdown notes.md > slack-message.txt
```

## What it converts

Slack uses [`mrkdwn`](https://docs.slack.dev/messaging/formatting-message-text/), not normal Markdown. The useful differences:

| Markdown | Slack `mrkdwn` |
| --- | --- |
| `**bold**` / `__bold__` | `*bold*` |
| `*italic*` | `_italic_` |
| `~~strike~~` | `~strike~` |
| `[label](https://example.com)` | `<https://example.com|label>` |
| `# Heading` | `*Heading*` |
| `- item` | `• item` by default |
| `- [x] done` | `☑ done` |
| tables | aligned code blocks |

It preserves fenced code blocks and inline code.

## Options

```txt
slackdown [--copy] [--quiet] [--bullet dot|dash] [file]
```

- `-c, --copy` copies converted output to your clipboard.
- `-q, --quiet` suppresses stdout when copying.
- `--bullet dot` emits `• item` for unordered lists. This is the default.
- `--bullet dash` emits `- item` if you prefer Slack's plain dash list style.

## Examples

Input:

```md
# Launch notes

Ship **the thing** and tell [the team](https://example.com).

- [x] build CLI
- [ ] paste into Slack
```

Output:

```txt
*Launch notes*

Ship *the thing* and tell <https://example.com|the team>.

☑ build CLI
☐ paste into Slack
```

## Research notes

Grounded against Slack's official formatting docs:

- Slack calls its format [`mrkdwn`](https://docs.slack.dev/messaging/formatting-message-text/) and explicitly says it is inspired by Markdown but uses different rules.
- Slack manual links use `<url|label>`.
- Slack has no special list syntax for app-published text; regular line-based list markers are used.
- Slack requires escaping `&`, `<`, and `>` in normal text.
- Slack does not support Markdown tables in messages, so this CLI converts pipe tables into fixed-width code blocks.

Existing options checked before building this:

- [`slackify-markdown`](https://www.npmjs.com/package/slackify-markdown) is a solid library, not a tiny Bun CLI.
- [`md-to-slack`](https://github.com/nicoespeon/md-to-slack) is a package API, not copy/paste-first CLI.
- [`mack`](https://github.com/tryfabric/mack) targets Slack Block Kit blocks, not plain message text.
- Browser tools/extensions exist, but this stays terminal-first and private.

## Development

```sh
bun install
bun test
bun run typecheck
```

## License

MIT
