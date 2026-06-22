import * as fs from "fs";
import { findTranscriptFiles, getProjectsDir, parseUsageEntries } from "../src/usage";

const now = Date.now();
const WEEK = 7 * 24 * 60 * 60 * 1000;
const since = now - WEEK;
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));

// 1) assistant usage 엔트리(가중 파서) 기준 토큰
const entries = parseUsageEntries(findTranscriptFiles(getProjectsDir())).filter(
  (e) => e.timestamp >= since
);
let input = 0, output = 0, cacheCreate = 0, cacheRead = 0;
const days = new Set<string>();
for (const e of entries) {
  input += e.inputTokens;
  output += e.outputTokens;
  cacheCreate += e.cacheCreationTokens;
  cacheRead += e.cacheReadTokens;
  days.add(new Date(e.timestamp).toISOString().slice(0, 10));
}

console.log("=== 최근 7일 (rolling) — assistant usage 기준 ===");
console.log("assistant 응답 수:", entries.length);
console.log("input         :", fmt(input));
console.log("output        :", fmt(output));
console.log("input+output  :", fmt(input + output), "  <-- '총 토큰'과 비교");
console.log("+cacheCreate  :", fmt(input + output + cacheCreate));
console.log("cacheRead     :", fmt(cacheRead));
console.log("활성 일수     :", days.size);

// 2) 원본 줄 기준 메시지/세션 카운트 ('메시지 608', '세션 9'와 비교)
let userMsgs = 0, asstMsgs = 0;
const sessions = new Set<string>();
for (const file of findTranscriptFiles(getProjectsDir())) {
  let content: string;
  try { content = fs.readFileSync(file, "utf-8"); } catch { continue; }
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let o: any;
    try { o = JSON.parse(line); } catch { continue; }
    if (!o?.timestamp || new Date(o.timestamp).getTime() < since) continue;
    if (o.type === "user") userMsgs++;
    if (o.type === "assistant") asstMsgs++;
    if (o.sessionId) sessions.add(o.sessionId);
  }
}
console.log("\n=== 최근 7일 — 원본 줄 기준 ===");
console.log("user 메시지   :", userMsgs);
console.log("assistant 메시지:", asstMsgs);
console.log("user+assistant:", userMsgs + asstMsgs, "  <-- '메시지 608'과 비교");
console.log("세션 수       :", sessions.size, "  <-- '세션 9'와 비교");
