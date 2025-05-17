async function main(argc: number, argv: string[]) {
	console.log("hello, world", argv)
}

main(process.argv.length, process.argv.slice(1))
