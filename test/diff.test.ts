import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lineDiff } from "../src/engine/diff.js";

describe("lineDiff", () => {
  it("marks added lines with +", () => {
    const d = lineDiff("a\nc", "a\nb\nc");
    assert.match(d, /^\+b$/m);
    assert.match(d, /^ a$/m);
    assert.match(d, /^ c$/m);
  });

  it("marks removed lines with -", () => {
    const d = lineDiff("a\nb\nc", "a\nc");
    assert.match(d, /^-b$/m);
  });

  it("treats an empty baseline as all-added", () => {
    const d = lineDiff("", "x\ny");
    assert.deepEqual(d.split("\n"), ["+x", "+y"]);
  });

  it("treats emptying a file as all-removed", () => {
    const d = lineDiff("x\ny", "");
    assert.deepEqual(d.split("\n"), ["-x", "-y"]);
  });
});
