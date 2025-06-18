import type { RequestData } from "./RequestTracker.ts"
import type { Config } from "./types/Config.ts"

export class Display {
	private readonly config: Config

	constructor(config: Config) {
		this.config = config
	}

	public refresh(openRequestList: Map<string, RequestData> = new Map()) {
		// clear the terminal window and hide cursor
		process.stdout.write("\x1b[2J\x1b[0;0H")
		process.stdout.write("\x1b[?25l")

		const w = process.stdout.columns
		const h = process.stdout.rows

		// top status bar
		const {
			listenPort: lp,
			destinationHost: dh,
			destinationPort: dp,
		} = this.config
		const runningMsg = `Server Running: localhost:${lp} -> ${dh}:${dp}`
		const lastUpdate = `Last Update: ${new Date().toLocaleString()}`
		const spacingLen = w - runningMsg.length - lastUpdate.length
		process.stdout.write(
			`${runningMsg}${" ".repeat(spacingLen)}${lastUpdate}`.slice(0, w),
		)

		process.stdout.write(" \n")

		// Ongoing Requests
		const title = "Ongoing Requests"
		const total = `${0} Total`
		process.stdout.write(
			`${title}${" ".repeat(w - title.length - total.length)}${total}`,
		)

		const sortedRequests = [...openRequestList]
			.sort((a, b) => b[1].lastCall - a[1].lastCall)
			.sort((a, b) => b[1].ongoing - a[1].ongoing)
			.slice(0, h - 4)

		for (const [url, { ongoing, calls }] of sortedRequests) {
			process.stdout.write(ongoing > 0 ? "\x1b[31m" : "\x1b[32m") // Set red
			process.stdout.write(`\n\r - (${ongoing} | ${calls}) ${url}`.slice(0, w))
			process.stdout.write("\x1b[0m") // Set default
		}

		if (sortedRequests.length < openRequestList.size) {
			const hidden = openRequestList.size - sortedRequests.length
			const text = `(${hidden} requests hidden)`
			const space = " ".repeat(Math.round((w - text.length) / 2))

			process.stdout.write(`\n\r${space}${text}${space}`.slice(0, w))
		}
	}
}
