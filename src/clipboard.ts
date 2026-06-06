import { Data, Effect } from "effect"

export class ClipboardError extends Data.TaggedError("ClipboardError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

interface ClipboardCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
}

export const copyToClipboard = (text: string): Effect.Effect<void, ClipboardError> =>
  Effect.flatMap(resolveClipboardCommand, (command) => writeClipboard(command, text))

const resolveClipboardCommand: Effect.Effect<ClipboardCommand, ClipboardError> = Effect.try({
  try: () => {
    switch (process.platform) {
      case "darwin":
        return { command: "pbcopy", args: [] }
      case "win32":
        return { command: "powershell.exe", args: ["-NoProfile", "-Command", "Set-Clipboard"] }
      default: {
        const wlCopy = Bun.which("wl-copy")
        if (wlCopy) return { command: wlCopy, args: [] }

        const xclip = Bun.which("xclip")
        if (xclip) return { command: xclip, args: ["-selection", "clipboard"] }

        const xsel = Bun.which("xsel")
        if (xsel) return { command: xsel, args: ["--clipboard", "--input"] }

        throw new ClipboardError({
          message: "No clipboard helper found. Install wl-copy, xclip, or xsel, or omit --copy."
        })
      }
    }
  },
  catch: (cause) => cause instanceof ClipboardError
    ? cause
    : new ClipboardError({ message: "Failed to resolve clipboard helper.", cause })
})

const writeClipboard = (clipboard: ClipboardCommand, text: string): Effect.Effect<void, ClipboardError> =>
  Effect.tryPromise({
    try: async () => {
      const proc = Bun.spawn([clipboard.command, ...clipboard.args], {
        stdin: "pipe",
        stdout: "ignore",
        stderr: "pipe"
      })

      proc.stdin.write(text)
      proc.stdin.end()

      const [exitCode, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stderr).text()
      ])

      if (exitCode !== 0) {
        throw new ClipboardError({
          message: stderr.trim() || `${clipboard.command} exited with code ${exitCode}`
        })
      }
    },
    catch: (cause) => cause instanceof ClipboardError
      ? cause
      : new ClipboardError({ message: "Failed to copy output to clipboard.", cause })
  })
