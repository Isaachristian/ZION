import {
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
	request,
} from "node:http"
import type { Config } from "./types/Config.ts"

export class ProxyServer {
	private readonly config: Config
	private readonly server: Server

	private openRequestList: Map<string, number> = new Map()

	constructor(config: Config) {
		this.config = config
		this.server = createServer(this.requestListener)
	}

	/** Runs the proxy server; returns after the server has been stopped */
	public run(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.listen(this.config.listenPort, () => {
				console.info(`Proxy running on port ${this.config.listenPort}`)

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
	 *
	 * @param req The incoming request from the client
	 * @param res The responce sent back to the client
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
		this.openRequestList.set(url, (this.openRequestList.get(url) || 0) + 1)

		console.info("open requests:", [
			...this.openRequestList
				.entries()
				.filter(([_, count]) => count > 0)
				.map(([url, count]) => `${url}: ${count}`),
		])
	}

	private removeRequest(url: string) {
		this.openRequestList.set(url, (this.openRequestList.get(url) || 0) - 1)

		console.info("open requests:", [
			...this.openRequestList
				.entries()
				.filter(([_, count]) => count > 0)
				.map(([url, count]) => `${url}: ${count}`),
		])
	}
}
