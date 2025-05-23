import type { RequestStats } from "../types/RequestStats.ts"

export class StatsTracker {
	private stats: Map<string, number[]> = new Map()
	private activeRequests: Map<string, RequestStats> = new Map()

	startTracking(requestId: string, pathname: string): void {
		this.activeRequests.set(requestId, {
			pathname,
			startTime: Date.now(),
		})
	}

	finishTracking(requestId: string): void {
		const request = this.activeRequests.get(requestId)
		if (!request) return

		const responseTime = Date.now() - request.startTime
		request.responseTime = responseTime

		// Update statistics for this pathname
		const times = this.stats.get(request.pathname) || []
		times.push(responseTime)
		this.stats.set(request.pathname, times)

		this.activeRequests.delete(requestId)
	}

	getAverageTime(pathname: string): number {
		const times = this.stats.get(pathname)
		if (!times || times.length === 0) return 0

		const sum = times.reduce((a, b) => a + b, 0)
		return sum / times.length
	}

	hasLongRunningRequests(threshold: number): boolean {
		for (const request of this.activeRequests.values()) {
			const currentDuration = Date.now() - request.startTime
			if (currentDuration > threshold) return true
		}
		return false
	}
}
