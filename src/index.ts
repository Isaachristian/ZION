import { exit } from "node:process"
import { Display } from "./Display.ts"
import { Logger } from "./Logger.ts"
import { ProxyServer } from "./ProxyServer.ts"
import { parseConfig } from "./utils/parseConfig.ts"
import { WebServer } from "./WebServer.ts"

async function main(argv: string[]) {
	const config = parseConfig(argv)
	const logger = new Logger(config.loglevel)
	const display = new Display(config)

	await Promise.all([
		new ProxyServer(config, logger, display).run(),
		new WebServer(config).run(),
	])

	return 0
}

main(process.argv.slice(1)).then(exit)
