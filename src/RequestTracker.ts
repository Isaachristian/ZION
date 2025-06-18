import type { IncomingMessage } from "node:http"
import type { Display } from "./Display.ts"
import type { Logger } from "./Logger.ts"

export type Stats = {
	calls: number
	lastCall: number
	averageResponseTime: number
}

export type OpenRequestData = {
	start: number
	url: string
}

const initialStat = {}

export class RequestTracker {
	private readonly logger: Logger

	/** Map from path to stats */
	private _stats: Map<string, Stats> = new Map()

	/** Map from request uuid to info */
	private _open: Map<number, OpenRequestData> = new Map()

	private nextID = 1

	constructor(logger: Logger, display: Display) {
		this.logger = logger
	}

	public get stats() {
		return this._stats
	}

	public get open() {
		return this._open
	}

	public track(req: IncomingMessage) {
		this.logger.info(`Tracking request: ${req.url}`)

		this._open.set(this.nextID, { start: Date.now(), url: req.url ?? "" })

		return this.nextID++
	}

	public untrack(id: number) {
		const req = this._open.get(id)
		if (!req) {
			this.logger.error(`Could not find request id ${id}!`)
			return
		}

		const { start, url } = req

		this.logger.log(`Untracking request: ${url}`)

		const stat: Stats = this._stats.get(url) ?? initialStat
		this._stats.set(url, {
			calls: stat.calls + 1,
			lastCall: stat.lastCall ?? Date.now(),
			averageResponseTime: 0,
		})
	}
}
