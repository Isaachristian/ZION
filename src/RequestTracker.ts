import type { IncomingMessage } from "node:http"
import type { Logger } from "./Logger.ts"

export type RequestStatistics = {
	calls: number
	lastCall: number
	averageResponseTime: number
}

export type OpenRequestData = {
	start: number
	url: string
}

const initialStat: RequestStatistics = {
	calls: 0,
	lastCall: 0,
	averageResponseTime: 0,
}

export class RequestTracker {
	private readonly logger: Logger

	/** Map from path to stats */
	private _stats: Map<string, RequestStatistics> = new Map()

	/** Map from request uuid to info */
	private _open: Map<number, OpenRequestData> = new Map()

	private nextID = 1

	constructor(logger: Logger) {
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

		const { averageResponseTime, calls } = this._stats.get(url) ?? initialStat
		const responseTime = Date.now() - start
		const newART = averageResponseTime
			? (averageResponseTime * calls + responseTime) / (calls + 1)
			: responseTime
		this._stats.set(url, {
			calls: calls + 1,
			lastCall: start,
			averageResponseTime: newART,
		})

		this._open.delete(id)
	}
}
