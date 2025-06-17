import { exit } from "node:process"
import { ProxyServer } from "./ProxyServer.ts"
import { WebServer } from "./WebServer.ts"
import { parseConfig } from "./utils/parseConfig.ts"

async function main(argv: string[]) {
	process.on("uncaughtException", (err) =>
		console.error("Uncaught Exception:", err),
	)

	const config = parseConfig(argv)
	await Promise.all([
		new ProxyServer(config).run(),
		new WebServer(config).run(),
	])

	return 0
}

main(process.argv.slice(1)).then(exit)
