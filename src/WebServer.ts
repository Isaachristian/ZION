import type { Config } from "./types/Config.ts"

// todo - Move elsewhere
export class WebServer {
	private config: Config

	constructor(config: Config) {
		this.config = config
	}

	public async run(): Promise<void> {
		return new Promise((res) =>
			setTimeout(() => {
				res()
			}, 5_000),
		)
	}
}
