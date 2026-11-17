import type { ToolCall, ToolResult } from "super-chat";
import type { HostToolDescriptor, ToolCapability } from "super-chat/contracts";

const toolDefinitions: HostToolDescriptor[] = [
	{
		name: "calculate",
		title: "Calculate expression",
		description: "Evaluate a basic arithmetic expression with parentheses and +, -, *, /, %, and ^ operators.",
		parameters: {
			type: "object",
			properties: {
				expression: {
					type: "string",
					description: "Arithmetic expression, such as (18 + 6) / 3.",
				},
			},
			required: ["expression"],
		},
		risk: "read",
		approval: "never",
		idempotent: true,
	},
	{
		name: "get_current_time",
		title: "Get current time",
		description: "Get the current local time and time zone on this device.",
		parameters: { type: "object", properties: {} },
		risk: "read",
		approval: "never",
		idempotent: false,
	},
];

type Token = { type: "number"; value: number } | { type: "operator"; value: string };

function tokenize(expression: string): Token[] {
	if (expression.length === 0 || expression.length > 200) {
		throw new Error("Enter an expression between 1 and 200 characters.");
	}

	const tokens: Token[] = [];
	let index = 0;
	while (index < expression.length) {
		if (/\s/.test(expression[index])) {
			index += 1;
			continue;
		}

		const rest = expression.slice(index);
		const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
		if (number) {
			const value = Number(number[0]);
			if (!Number.isFinite(value)) throw new Error("Numbers must be finite.");
			tokens.push({ type: "number", value });
			index += number[0].length;
		} else if ("()+-*/%^".includes(expression[index])) {
			tokens.push({ type: "operator", value: expression[index] });
			index += 1;
		} else {
			throw new Error("Only numbers, parentheses, and +, -, *, /, %, ^ are allowed.");
		}

		if (tokens.length > 100) throw new Error("Expression has too many parts.");
	}
	return tokens;
}

class ArithmeticParser {
	private index = 0;

	constructor(private readonly tokens: Token[]) {}

	parse(): number {
		const result = this.parseAdditive();
		if (this.index !== this.tokens.length) throw new Error("Expression has an unexpected value.");
		return this.requireFinite(result);
	}

	private parseAdditive(): number {
		let value = this.parseMultiplicative();
		while (this.peek("+") || this.peek("-")) {
			const operator = this.takeOperator();
			const right = this.parseMultiplicative();
			value = operator === "+" ? value + right : value - right;
		}
		return this.requireFinite(value);
	}

	private parseMultiplicative(): number {
		let value = this.parseUnary();
		while (this.peek("*") || this.peek("/") || this.peek("%")) {
			const operator = this.takeOperator();
			const right = this.parseUnary();
			if ((operator === "/" || operator === "%") && right === 0) {
				throw new Error("Cannot divide by zero.");
			}
			value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
		}
		return this.requireFinite(value);
	}

	private parseUnary(): number {
		if (this.peek("+")) {
			this.takeOperator();
			return this.parseUnary();
		}
		if (this.peek("-")) {
			this.takeOperator();
			return this.requireFinite(-this.parseUnary());
		}
		return this.parsePower();
	}

	private parsePower(): number {
		const base = this.parsePrimary();
		if (!this.peek("^")) return base;
		this.takeOperator();
		const exponent = this.parseUnary();
		if (Math.abs(exponent) > 100) throw new Error("Exponent must be between -100 and 100.");
		return this.requireFinite(base ** exponent);
	}

	private parsePrimary(): number {
		const token = this.tokens[this.index];
		if (token?.type === "number") {
			this.index += 1;
			return token.value;
		}
		if (this.peek("(")) {
			this.takeOperator();
			const value = this.parseAdditive();
			if (!this.peek(")")) throw new Error("A closing parenthesis is missing.");
			this.takeOperator();
			return value;
		}
		throw new Error("A number or parenthesized expression was expected.");
	}

	private peek(value: string): boolean {
		const token = this.tokens[this.index];
		return token?.type === "operator" && token.value === value;
	}

	private takeOperator(): string {
		const token = this.tokens[this.index];
		if (token?.type !== "operator") throw new Error("An operator was expected.");
		this.index += 1;
		return token.value;
	}

	private requireFinite(value: number): number {
		if (!Number.isFinite(value)) throw new Error("Result is outside the supported number range.");
		return value;
	}
}

function calculate(expression: unknown): ToolResult {
	if (typeof expression !== "string") {
		return { success: false, error: "The expression must be text." };
	}
	try {
		const value = new ArithmeticParser(tokenize(expression)).parse();
		return { success: true, content: String(value) };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Could not evaluate expression." };
	}
}

function currentTime(): ToolResult {
	const now = new Date();
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time zone";
	return {
		success: true,
		content: `${now.toLocaleString()} (${timeZone}); UTC ${now.toISOString()}`,
	};
}

export const standaloneTools: ToolCapability = {
	id: "standalone-local-tools",
	kind: "tools",
	async getTools() {
		return toolDefinitions.map((definition) => ({ ...definition }));
	},
	async executeTool(call: ToolCall): Promise<ToolResult> {
		if (call.name === "calculate") return calculate(call.args.expression);
		if (call.name === "get_current_time") return currentTime();
		return { success: false, error: `Unknown standalone tool: ${call.name}` };
	},
};
