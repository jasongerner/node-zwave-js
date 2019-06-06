import { stripColor } from "ansi-colors";
import * as Transport from "winston-transport";
import log from "./index";
import { serialLoggerFormat } from "./Serial";
import { messageSymbol } from "./shared";
import winston = require("winston");

/** Log to a jest.fn() in order to perform assertions during unit tests */
export class SpyTransport extends Transport {
	public constructor() {
		super({
			level: "silly",
		});
		this._spy = jest.fn();
	}

	private _spy: jest.Mock;
	public get spy(): jest.Mock {
		return this._spy;
	}

	public log(info: any, next: () => void): any {
		this._spy(info);
		next();
	}
}

/** Tests a printed log message */
function assertMessage(
	transport: SpyTransport,
	options: Partial<{
		message: string;
		predicate: (msg: string) => boolean;
		stripColor: boolean;
		callNumber: number;
	}>,
) {
	const callNumber = options.callNumber || 0;
	expect(transport.spy.mock.calls.length).toBeGreaterThan(callNumber);

	const callArg = transport.spy.mock.calls[callNumber][0];
	let actualMessage = callArg[messageSymbol];

	if (options.stripColor) {
		actualMessage = stripColor(actualMessage);
	}
	if (typeof options.message === "string") {
		expect(actualMessage).toBe(options.message);
	}
	if (typeof options.predicate === "function") {
		expect(actualMessage).toSatisfy(options.predicate);
	}
}

describe("lib/log/Serial", () => {
	let serialLogger: winston.Logger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		serialLogger = winston.loggers.get("serial");
		spyTransport = new SpyTransport();
		serialLogger.configure({
			format: serialLoggerFormat,
			transports: [
				// new winston.transports.Console({ level: "silly" }),
				spyTransport,
			],
		});
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	it("logs the correct message for an inbound ACK", () => {
		log.serial.ACK("inbound");
		assertMessage(spyTransport, {
			message: "<-  [ACK] (0x06)",
			stripColor: true,
		});
	});
});
