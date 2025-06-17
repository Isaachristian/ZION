import {
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
	request,
} from "node:http"
import type { Config } from "./types/Config.ts"

type RequestData = {
	ongoing: number
	calls: number
	lastCall: number
}

export class ProxyServer {
	private readonly config: Config
	private readonly server: Server

	private openRequestList: Map<string, RequestData> = new Map()

	constructor(config: Config) {
		this.config = config
		this.server = createServer(this.requestListener)
	}

	/** Runs the proxy server; returns after the server has been stopped */
	public run(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.listen(this.config.listenPort, () => {
				// console.info(`Proxy running on port ${this.config.listenPort}`)
				this.displayState()

				process.on("SIGINT", () => {
					console.info("\n\nGracefully shutting server down...\n\n")
					this.server.closeAllConnections()
					this.server.close((err) => (err ? reject(err) : resolve()))
				})
			})
		})
	}

	/**
	 * Forwards all requests from the client to the server; this must be a higher
	 * order function or else "this" refers to createServer (where this method is
	 * called)
	 */
	private requestListener = (req: IncomingMessage, res: ServerResponse) => {
		if (req.url) this.addRequest(req.url)

		// re-creates the client request and forwards it to the server
		const proxyReq = request({
			hostname: this.config.destinationHost,
			port: this.config.destinationPort,
			path: req.url,
			method: req.method,
			headers: req.headers,
		})

		// pipe any data into the request
		req.pipe(proxyReq)

		// once the client request is finished, end the request so the server will
		// handle it
		req.once("end", () => proxyReq.end())

		// once the server responds, forward it back to the client
		proxyReq.once("response", (proxyRes) => {
			res.statusCode = proxyRes.statusCode || 200

			for (const key of Object.keys(proxyRes.headers)) {
				const value = proxyRes.headers[key]
				if (value) res.setHeader(key, value)
			}

			proxyRes.pipe(res)

			// On response end, finish tracking
			proxyRes.once("end", () => {
				res.end()

				if (req.url) this.removeRequest(req.url)
			})
		})
	}

	private addRequest(url: string) {
		const stats = this.openRequestList.get(url)

		this.openRequestList.set(url, {
			ongoing: (stats?.ongoing || 0) + 1,
			calls: (stats?.calls || 0) + 1,
			lastCall: Date.now(),
		})

		this.displayState()
		// console.info("open requests:", [
		// 	...this.openRequestList
		// 		.entries()
		// 		.filter(([_, count]) => count > 0)
		// 		.map(([url, count]) => `${url}: ${count}`),
		// ])
	}

	private removeRequest(url: string) {
		const stats = this.openRequestList.get(url)

		this.openRequestList.set(url, {
			ongoing: (stats?.ongoing || 1) - 1,
			calls: stats?.calls ?? 0,
			lastCall: stats?.lastCall ?? Date.now(),
		})

		this.displayState()
		// console.info("open requests:", [
		// 	...this.openRequestList
		// 		.entries()
		// 		.filter(([_, count]) => count > 0)
		// 		.map(([url, count]) => `${url}: ${count}`),
		// ])
	}

	private displayState() {
		// clear the terminal window and hide cursor
		process.stdout.write("\x1b[2J\x1b[0;0H")
		process.stdout.write("\x1b[?25l")

		const w = process.stdout.columns
		const h = process.stdout.rows

		// top status bar
		const d = new Date()
		const runningMsg = `Server Running On Port ${this.config.listenPort}`
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

		const sortedRequests = [...this.openRequestList]
			.sort((a, b) => b[1].lastCall - a[1].lastCall)
			// .sort((a, b) => b[1].ongoing - a[1].ongoing)
			.slice(0, h - 4)

		for (const [url, { ongoing, calls }] of sortedRequests) {
			process.stdout.write(ongoing > 0 ? "\x1b[31m" : "\x1b[32m") // Set red
			process.stdout.write(`\n\r - (${ongoing} | ${calls}) ${url}`.slice(0, w))
			process.stdout.write("\x1b[0m") // Set default
		}

		if (sortedRequests.length < this.openRequestList.size) {
			const hidden = this.openRequestList.size - sortedRequests.length
			const text = `(${hidden} requests hidden)`
			const space = " ".repeat(Math.round((w - text.length) / 2))

			process.stdout.write(`\n\r${space}${text}${space}`.slice(0, w))
		}
	}
}
