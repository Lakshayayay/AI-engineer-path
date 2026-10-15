// Run: node --no-warnings lib/math.check.ts   (Node 22.6+; prints "math ok" if every assertion holds)
import assert from "node:assert/strict";
import { evaluate } from "./math.ts";

assert.equal(evaluate("2 + 2"), 4);
assert.equal(evaluate("23 * 47 + 8"), 1089);
assert.equal(evaluate("2 + 3 * 4"), 14); // precedence
assert.equal(evaluate("(2 + 3) * 4"), 20); // parentheses
assert.equal(evaluate("-5 + 2"), -3); // unary minus
assert.equal(evaluate("10 / 4"), 2.5);
assert.equal(evaluate("1.5 * 2"), 3);

assert.throws(() => evaluate("1 / 0"), /Division by zero/);
assert.throws(() => evaluate("(1 + 2"), /closing parenthesis/);
assert.throws(() => evaluate("2 +"), /end of input/);
assert.throws(() => evaluate("2 3"), /Unexpected/);
assert.throws(() => evaluate("process.exit()"), /Unexpected/); // never executed as code

console.log("math ok");
