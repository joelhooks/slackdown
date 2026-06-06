import { Args, Command, Options } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Console, Data, Effect, Option } from "effect"
import { copyToClipboard } from "./clipboard"
import { convertMarkdownToSlack, type ConvertOptions } from "./convert"

class InputError extends Data.TaggedError("InputError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

const fileArg = Args.path({ name: "file" }).pipe(
  Args.optional,
  Args.withDescription("Markdown file to convert. Omit to read from stdin.")
)

const copyFlag = Options.boolean("copy").pipe(
  Options.withAlias("c"),
  Options.withDescription("Copy the Slack-ready output to your clipboard.")
)

const quietFlag = Options.boolean("quiet").pipe(
  Options.withAlias("q"),
  Options.withDescription("Do not print the converted output when --copy is used.")
)

const bulletFlag = Options.choice("bullet", ["dot", "dash"] as const).pipe(
  Options.withDefault("dot" as const),
  Options.withDescription("Unordered list marker to emit: dot uses •, dash uses -.")
)

const command = Command.make(
  "slackdown",
  { file: fileArg, copy: copyFlag, quiet: quietFlag, bullet: bulletFlag },
  ({ file, copy, quiet, bullet }) =>
    Effect.gen(function* () {
      const input = yield* readInput(file)
      const output = convertMarkdownToSlack(input, { bullet } satisfies ConvertOptions)

      if (copy) yield* copyToClipboard(output)
      if (!copy || !quiet) yield* writeStdout(output)
      if (copy && quiet) yield* Console.error("Copied Slack-ready mrkdwn to clipboard.")
    }).pipe(
      Effect.catchTags({
        InputError: (error) => Console.error(`slackdown: ${error.message}`).pipe(Effect.zipRight(Effect.fail(error))),
        ClipboardError: (error) => Console.error(`slackdown: ${error.message}`).pipe(Effect.zipRight(Effect.fail(error)))
      })
    )
).pipe(
  Command.withDescription(
    "Convert regular Markdown into Slack mrkdwn so copied text renders cleanly in Slack."
  )
)

const cli = Command.run(command, {
  name: "slackdown",
  version: "0.1.0"
})

export const run = (argv: ReadonlyArray<string> = process.argv): void => {
  Effect.suspend(() => cli(argv)).pipe(
    Effect.provide(BunContext.layer),
    BunRuntime.runMain
  )
}

const readInput = (file: Option.Option<string>): Effect.Effect<string, InputError> =>
  Option.match(file, {
    onSome: readFile,
    onNone: () => readStdin
  })

const readFile = (path: string): Effect.Effect<string, InputError> =>
  Effect.tryPromise({
    try: () => Bun.file(path).text(),
    catch: (cause) => new InputError({ message: `Could not read ${path}`, cause })
  })

const readStdin: Effect.Effect<string, InputError> = Effect.tryPromise({
  try: async () => {
    if (process.stdin.isTTY === true) {
      throw new InputError({ message: "Pass a markdown file or pipe markdown on stdin." })
    }

    return await new Response(Bun.stdin.stream()).text()
  },
  catch: (cause) => cause instanceof InputError
    ? cause
    : new InputError({ message: "Could not read markdown from stdin.", cause })
})

const writeStdout = (output: string): Effect.Effect<void> =>
  Effect.promise(async () => {
    await Bun.write(Bun.stdout, output.endsWith("\n") ? output : `${output}\n`)
  })
