# 2026-06-22 — 데이터 출처 결정

## 오늘 한 일
- 프로젝트 초기 셋업 (CLAUDE.md, .gitignore, git repo 연결)
- "Claude 사용량"을 어디서 가져올지 조사 및 결정

## 배운 것: "Claude 사용량"은 두 종류다

| 종류 | 정체 | 데이터 출처 | 키/크레딧 |
|------|------|------------|-----------|
| API 사용량 | console.anthropic.com 코드 호출 (토큰당 과금) | Anthropic Admin Usage API | Admin 키 필요 + 실사용 위해 크레딧 필요 |
| Claude Code/구독 사용량 | CLI·구독으로 쓴 양 (5h/주간 한도) | 로컬 `~/.claude/` | 불필요 |

→ 우리는 **구독/Claude Code 사용량**을 원하므로 **로컬 파일** 방식 채택.

### Admin API에 대해 알아둔 것 (이번엔 안 쓰지만 기록)
- 엔드포인트: `GET https://api.anthropic.com/v1/organizations/usage_report/messages`
- 헤더: `x-api-key: sk-ant-admin...`, `anthropic-version: 2023-06-01`
- Admin 키 생성: console.anthropic.com → Settings → Admin Keys (조직 owner만)
- 키 생성·조회 호출 자체는 무료. 단 보여줄 데이터가 생기려면 API를 실제로 써야 함.

## 로컬 데이터 구조 (`~/.claude/`)

### stats-cache.json (집계, 과거용)
- `dailyActivity[]`, `dailyModelTokens[]`, `modelUsage{}`
- `lastComputedDate` 기준 주기적 갱신 → 실시간 아님

### projects/<인코딩-cwd>/<세션UUID>.jsonl (원본, 실시간)
- 한 줄 = JSON 객체. assistant 메시지에 토큰 상세:
  ```json
  {"type":"assistant","timestamp":"2026-06-22T06:11:52.813Z",
   "message":{"model":"claude-sonnet-4-6",
     "usage":{"input_tokens":2,"cache_creation_input_tokens":7337,
       "cache_read_input_tokens":15536,"output_tokens":231}}}
  ```
- timestamp로 시간 윈도우(5h/주간) 집계 가능

## 배운 것: Obsidian 플러그인의 파일 접근

- Obsidian Vault API(`this.app.vault`)는 **Vault 폴더 안**만 접근 가능
- `~/.claude/`는 Vault 밖 → Node.js `fs` + `os.homedir()`로 읽어야 함
- 데스크톱(Electron)에서만 Node API 사용 가능 → `manifest.json`에 `isDesktopOnly: true` 필수
- 비유: Vault API는 "내 집 안 물건"만 볼 수 있는 손, Node fs는 "집 밖"까지 닿는 손

## 다음 단계
- Phase 1: 프로젝트 초기 셋업 (manifest/package/tsconfig/esbuild + Plugin 뼈대)
- 바가 무엇을 보여줄지 확정 (5h 윈도우 vs 일별 추이)
