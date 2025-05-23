export type Config = {
	https: boolean
	listenPort: number
	destinationPort: number
	destinationHost: string
	loglevel: "normal" | "verbose"
}

export const initConfig: Config = {
	https: false,
	listenPort: 0,
	destinationPort: 0,
	destinationHost: "localhost",
	loglevel: "normal",
} as const
