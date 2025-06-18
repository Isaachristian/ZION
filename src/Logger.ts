import { createWriteStream } from "node:fs"
import type { Writable } from "node:stream"
import type { LogLevel } from "./LogLevel.ts"

export class Logger {
	private readonly filestream: Writable
	private readonly logLevel: LogLevel

	constructor(logLevel: LogLevel = "Log") {
		this.filestream = createWriteStream("logs.txt")
		this.logLevel = logLevel
	}

	public info(text: unknown) {
		this.write(text?.toString(), "Info")
	}

	public log(text: unknown) {
		this.write(text?.toString(), "Log")
	}

	public error(text: unknown) {
		this.write(text?.toString(), "Error")
	}

	private write(text: string | undefined, level: LogLevel) {
		if (text === undefined) return
		if (this.logLevel === "Log" && level === "Info") return
		if (this.logLevel === "Error" && (level === "Info" || level === "Log"))
			return

		for (const line of text.split("\n")) {
			this.filestream.write(
				`[${new Date().toISOString()}] ${level.toUpperCase()}: ${text}\n`,
			)
		}
	}

	// end
}
