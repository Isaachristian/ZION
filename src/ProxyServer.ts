import {
	createServer,
	type IncomingMessage,
	request,
	type Server,
	type ServerResponse,
} from "node:http"
import type { Display } from "./Display.ts"
import type { Logger } from "./Logger.ts"
import { RequestTracker } from "./RequestTracker.ts"
import type { Config } from "./types/Config.ts"

export class ProxyServer {
	private readonly config: Config

	// utilities
	private readonly logger: Logger
	private readonly display: Display
	private readonly tracker: RequestTracker

	// state
	private readonly server: Server

	constructor(config: Config, logger: Logger, display: Display) {
		this.config = config
		this.logger = logger
		this.display = display
		this.tracker = new RequestTracker(this.logger)
		this.server = createServer(this.requestListener)
	}

	/** Runs the proxy server; returns after the server has been stopped */
	public run(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.listen(this.config.listenPort, () => {
				process.on("SIGINT", () => {
					this.logger.info("\n\nGracefully shutting server down...\n\n")

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
		// const notFile = ![
		// 	".ts",
		// 	".js",
		// 	".mjs",
		// 	".pcss",
		// 	".css",
		// 	".svelte",
		// 	".svg",
		// ].some((e) => req?.url?.endsWith(e))
		// const reqID = notFile ? this.tracker.track(req) : 0
		const reqID = this.tracker.track(req)
		this.display.update(this.tracker.open, this.tracker.stats)

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

		// TODO: Handle error
		req.on("error", () => {})

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

			// TODO: Handle error

			// On response end, finish tracking
			proxyRes.once("end", () => {
				res.end()

				this.tracker.untrack(reqID)
				this.display.update(this.tracker.open, this.tracker.stats)
			})
		})
	}
}
