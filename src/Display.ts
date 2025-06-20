import type { OpenRequestData, RequestStatistics } from "./RequestTracker.ts"
import type { Config } from "./types/Config.ts"

export class Display {
	private readonly config: Config

	private openRequests: Map<number, OpenRequestData> = new Map()
	private requestStats: Map<string, RequestStatistics> = new Map()

	constructor(config: Config) {
		this.config = config

		process.stdout.write("\x1b[2J\x1b[0;0H")

		this.draw()
		this.cycle()

		process.once("SIGTERM", () => process.stdout.write("\x1b[?25h"))
		process.once("SIGINT", () => process.stdout.write("\x1b[?25h"))
	}

	public update(
		openRequests: Map<number, OpenRequestData>,
		requestStats: Map<string, RequestStatistics>,
	) {
		this.openRequests = openRequests
		this.requestStats = requestStats

		this.draw()
	}

	private draw() {
		// clear the terminal window and hide cursor
		process.stdout.write("\u001b[1;1H") // reset to top left
		process.stdout.write("\x1b[?25l") // hide cursor

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

		const sortedRequests = [...this.openRequests]
			.sort((a, b) => b[1].start - a[1].start)
			.slice(0, h - 4)

		for (const [id, { start, url }] of sortedRequests) {
			process.stdout.write("\x1b[31m") // Set red
			process.stdout.write(`\n\r - (${id}) ${url}`.slice(0, w))
			process.stdout.write("\x1b[0m") // Set default
		}

		if (sortedRequests.length < this.openRequests.size) {
			const hidden = this.openRequests.size - sortedRequests.length
			const text = `(${hidden} requests hidden)`
			const space = "-".repeat(Math.round((w - text.length) / 2))

			process.stdout.write(`\n\r${space}${text}${space}`.slice(0, w))
		}
	}

	private cycle() {
		setTimeout(() => (this.draw(), this.cycle()), 1000)
	}
}
