import type { LogLevel } from "../LogLevel.ts"

export type Config = {
	https: boolean
	listenPort: number
	destinationPort: number
	destinationHost: string
	loglevel: LogLevel
}

export const initConfig: Config = {
	https: false,
	listenPort: 0,
	destinationPort: 0,
	destinationHost: "localhost",
	loglevel: "Log",
} as const
