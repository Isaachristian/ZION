import {
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
	request,
} from "node:http"
import type { Config } from "./types/Config.ts"
import type { Logger } from "./Logger.ts"
import type { Display } from "./Display.ts"
import { RequestTracker } from "./RequestTracker.ts"

export class ProxyServer {
	private readonly config: Config
	private readonly logger: Logger
	private readonly display: Display

	private readonly server: Server
	private readonly tracker: RequestTracker

	constructor(config: Config, logger: Logger, display: Display) {
		this.config = config
		this.logger = logger
		this.display = display

		this.server = createServer(this.requestListener)
		this.tracker = new RequestTracker(logger)
	}

	/** Runs the proxy server; returns after the server has been stopped */
	public run(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.listen(this.config.listenPort, () => {
				this.display.refresh()

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
		const reqID = this.tracker.track(req)

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

			// On response end, finish tracking
			proxyRes.once("end", () => {
				res.end()

				if (req.url) this.tracker.untrack(req.url)
			})
		})
	}
}
