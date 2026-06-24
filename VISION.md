# slackdown Vision

## Intent

`slackdown` is a tiny terminal-first converter from regular Markdown to Slack `mrkdwn`.

Its job is to make copy/paste Slack messages stop breaking on common Markdown features such as bold text, links, headings, task lists, bullets, and tables. It should stay small, private-friendly, and useful from a shell pipeline.

## Who It Serves

- Operators writing release notes, status updates, or support messages for Slack.
- Developers who want a copy/paste-first CLI instead of a larger Slack Block Kit workflow.
- Agents that need predictable plain-text Slack formatting without opening a browser.

## Product Bet

Most Slack formatting pain does not need a full app. A small Bun + Effect CLI that converts the Markdown people already write is enough when the output is clean, predictable, and easy to pipe or copy.

## Priorities

1. **Plain message fidelity.** Preserve the common meaning of Markdown while emitting Slack `mrkdwn`.
2. **Copy/paste speed.** Keep `slackdown README.md --copy` and stdin usage as the main workflows.
3. **Small surface area.** Prefer focused conversion rules over a broad rendering engine.
4. **Safe terminal defaults.** Print to stdout unless copying is explicitly requested.
5. **Grounded Slack behavior.** Keep rules aligned with Slack's documented formatting quirks.

## Non-Goals

- Do not become a Slack bot or message-sending client.
- Do not target Slack Block Kit as the main output.
- Do not preserve every Markdown extension at the cost of predictable plain messages.
- Do not add browser/editor workflows that make the CLI heavier than the problem.

## Merge By Default

Merge small, tested changes that:

- improve Markdown-to-`mrkdwn` conversion fidelity;
- add focused tests for Slack formatting edge cases;
- clarify CLI options or examples;
- keep stdout/copy behavior predictable;
- reduce dependencies or implementation complexity.

## Needs Owner Sign-Off

Stop for explicit approval before:

- adding networked Slack API posting;
- changing default bullet, link, code block, or table output behavior;
- adding persistent config or credential handling;
- widening the project into a general Slack automation toolkit.

## Evidence Of Progress

The project is working when:

- common Markdown snippets produce readable Slack `mrkdwn`;
- copy and stdout workflows both behave predictably;
- tables degrade into readable fixed-width code blocks;
- tests cover the supported conversion rules;
- the CLI remains easy to install and explain.
