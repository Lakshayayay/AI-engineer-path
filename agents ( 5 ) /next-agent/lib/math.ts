/**
 * Safe arithmetic evaluator: numbers, + - * /, parentheses, unary minus.
 * A tiny recursive-descent parser, so the model's input is never run as code (no eval).
 *
 * Grammar (lowest precedence first):
 *   expression = term   (("+" | "-") term)*
 *   term       = factor (("*" | "/") factor)*
 *   factor     = "-" factor | number | "(" expression ")"
 *
 * Self-check: `node --no-warnings lib/math.check.ts`
 */
export function evaluate(input: string): number {
  // Numbers, single operators/parentheses, or any other single character (which fails later).
  const tokens = input.match(/\d+\.?\d*|\.\d+|[-+*/()]|\S/g) ?? [];
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      value = next() === "+" ? value + parseTerm() : value - parseTerm();
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      if (next() === "*") {
        value *= parseFactor();
      } else {
        const divisor = parseFactor();
        if (divisor === 0) throw new Error("Division by zero");
        value /= divisor;
      }
    }
    return value;
  }

  function parseFactor(): number {
    const token = next();
    if (token === "-") return -parseFactor();
    if (token === "(") {
      const value = parseExpression();
      if (next() !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    const number = Number(token);
    if (token === undefined || Number.isNaN(number)) {
      throw new Error(`Unexpected ${token === undefined ? "end of input" : `"${token}"`}`);
    }
    return number;
  }

  const result = parseExpression();
  if (position < tokens.length) throw new Error(`Unexpected "${peek()}"`);
  return result;
}
