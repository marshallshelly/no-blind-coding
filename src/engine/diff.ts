/**
 * A compact line-level diff so review can focus on what the developer actually
 * wrote, not the whole file. LCS-based, zero dependencies. Output is a simple
 * annotated form: " " unchanged, "-" removed, "+" added.
 */

export function lineDiff(oldText: string, newText: string): string {
  const a = oldText.length ? oldText.split("\n") : [];
  const b = newText.length ? newText.split("\n") : [];
  const m = a.length;
  const n = b.length;

  // dp[i][j] = length of the longest common subsequence of a[i..] and b[j..].
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const lines: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      lines.push(` ${a[i]}`);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      lines.push(`-${a[i]}`);
      i++;
    } else {
      lines.push(`+${b[j]}`);
      j++;
    }
  }
  while (i < m) lines.push(`-${a[i++]}`);
  while (j < n) lines.push(`+${b[j++]}`);

  return lines.join("\n");
}
