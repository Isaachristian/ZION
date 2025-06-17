import { exit } from "node:process"
import { type Config, initConfig } from "../types/Config.ts"

export function parseConfig(argv: string[]): Config {
	const config = { ...initConfig }

	const fail = (reason: string) => {
		console.error(`Invalid Usage: ${reason}`)
		console.error(
			// biome-ignore lint/style/useTemplate: performance is not importent here
			`\n\n  Valid usage: ${argv.at(0)} --listen-port=<PORT>` +
				" --destination-port=<PORT> --destination-host=<HOST>" +
				" --https=<BOOLEAN>\n\n",
		)

		exit(1)
	}

	if (!argv.join(" ").includes("listen-port"))
		fail("Should include a listen port")

	if (!argv.join(" ").includes("destination-port"))
		fail("Should include a destination port")

	for (const arg of argv.slice(1)) {
		if (!arg.startsWith("--")) fail("Unrecognized argument")

		const [key, value] = arg.substring(2).split("=")
		if (!value) continue

		switch (key) {
			case "help":
				break
			case "listen-port":
				config.listenPort = Number.parseInt(value, 10)
				break
			case "destination-port":
				config.destinationPort = Number.parseInt(value, 10)
				break
			case "destination-host":
				config.destinationHost = value.trim()
				break
			case "https":
				config.https = value.toLowerCase() === "true"
				break
			default:
				break
		}
	}

	return config
}
