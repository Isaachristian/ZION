import type { OpenRequestData, RequestStatistics } from "./RequestTracker.ts"
import type { Config } from "./types/Config.ts"

export class Display {
	private readonly config: Config

	private openRequests: Map<number, OpenRequestData> = new Map()
	private sortedOngoingRequests: [number, OpenRequestData][] = []
	private requestStats: Map<string, RequestStatistics> = new Map()
	private sortedRequestStats: [string, RequestStatistics][] = []

	constructor(config: Config) {
		this.config = config

		process.stdout.write("\x1b[2J\x1b[0;0H")
		process.stdout.write("\x1b[?25l") // hide cursor

		this.draw()

		this.autoRefresh()

		// show cursor on exit
		process.once("SIGTERM", () => process.stdout.write("\x1b[?25h"))
		process.once("SIGINT", () => process.stdout.write("\x1b[?25h"))
	}

	public update(
		openRequests: Map<number, OpenRequestData>,
		requestStats: Map<string, RequestStatistics>,
	) {
		this.openRequests = openRequests
		this.sortedOngoingRequests = [...this.openRequests].sort(
			(a, b) => b[1].start - a[1].start,
		)

		this.requestStats = requestStats
		this.sortedRequestStats = [...this.requestStats].sort(
			(a, b) => b[1].averageResponseTime - a[1].averageResponseTime,
		)

		this.draw()
	}

	private draw() {
		// clear the terminal window and hide cursor
		process.stdout.write("\u001b[1;1H") // reset to top left

		const write = (s: string, level: 1 | 2 | null = null, centered = false) => {
			if (centered) {
				const padding = " ".repeat(Math.max(0, Math.ceil((w - s.length) / 2)))
				s = `${padding}${s}${padding}`
			}

			if (level === 1) process.stdout.write("\u001b[30m\u001b[46m")
			if (level === 2) process.stdout.write("\u001b[30m\u001b[47m")

			if (s.length > w) process.stdout.write(s.slice(0, w))
			if (s.length <= w) process.stdout.write(s + " ".repeat(w - s.length))

			process.stdout.write("\u001b[0m")
		}

		const w = process.stdout.columns
		const h = process.stdout.rows

		for (let row = 1; row <= h; row++) {
			switch (true) {
				// top status bar
				case row === 1: {
					const {
						listenPort: lp,
						destinationHost: dh,
						destinationPort: dp,
					} = this.config
					const runningMsg = `Server Running: localhost:${lp} -> ${dh}:${dp}`
					const lastUpdate = `${new Date().toLocaleString()}`
					const spacing = " ".repeat(w - runningMsg.length - lastUpdate.length)
					write(`${runningMsg}${spacing}${lastUpdate}`, 1)

					break
				}

				// ongoing requests header
				case row === 2: {
					const title = `Ongoing Requests (${this.openRequests.size})`
					write(`${title}`.slice(0, w), 2, true)

					break
				}

				// ongoing requests
				case row >= 3 && row <= 8: {
					const request = this.sortedOngoingRequests.at(row - 3)

					if (!request) {
						write("")
						break
					}

					const [id, { url, start }] = request
					const paddedId = id.toString().padStart(5, "0")
					const duration = this.getDuration(start)
					write(`${paddedId} - ${url} (${duration})`)

					break
				}

				case row === 9: {
					if (this.sortedOngoingRequests.length <= 6) {
						write("")
						break
					}

					write(`${this.sortedOngoingRequests.length - 6} hidden`, null, true)

					break
				}

				case row === 10: {
					const title = ` Request Statistics (${this.requestStats.size}) `
					write(`${title}`, 2, true)

					break
				}

				case row >= 11 && row <= h - 1: {
					const request = this.sortedRequestStats.at(row - 11)

					if (!request) {
						write("")
						break
					}

					const [url, { averageResponseTime: art, calls, lastCall }] = request
					write(`${art.toFixed(0).padStart(6, " ")} ms - ${url}`)

					break
				}

				case row === h: {
					if (this.sortedRequestStats.length <= h - 11) {
						write("")
						break
					}

					write(`${this.sortedRequestStats.length - 6} hidden`, null, true)

					break
				}

				default: {
					write(``)
					break
				}
			}
		}
	}

	private autoRefresh() {
		setTimeout(() => {
			this.draw()
			this.autoRefresh()
		}, 1000)
	}

	private getSortedOngoingRequests() {
		return [...this.openRequests].sort((a, b) => b[1].start - a[1].start)
	}

	private getSortedRequestStats() {
		return [...this.requestStats].sort(
			(a, b) => b[1].averageResponseTime - a[1].averageResponseTime,
		)
	}

	private getDuration(start: number, end: number = Date.now()) {
		const sec = Math.round((end - start) / 1_000)
		const min = Math.floor(sec / 60)
		const hrs = Math.floor(min / 60)

		if (hrs > 0) return `${hrs}h ${min}m ${sec % 60}s`
		if (min > 0) return `${min}m ${sec % 60}s`

		return `${sec % 60}s`
	}
}
