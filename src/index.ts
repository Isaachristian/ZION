import { exit } from "node:process"
import { ProxyServer } from "./ProxyServer.ts"
import { parseConfig } from "./utils/parseConfig.ts"

async function main(argv: string[]) {
	process.on("uncaughtException", (err) =>
		console.error("Uncaught Exception:", err),
	)

	const config = parseConfig(argv)

	const proxy = new ProxyServer(config)
	// create the web server

	await Promise.all([
		proxy.run(),
		// todo run web server
	])

	return 0
}

main(process.argv.slice(1)).then(exit)
