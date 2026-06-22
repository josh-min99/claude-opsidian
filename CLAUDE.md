# Obsidian Claude Usage Plugin

## 프로젝트 개요

Obsidian 플러그인으로 내 컴퓨터의 **Claude Code / 구독 사용량**을 시각적 바(bar) 형태로 표시한다.
기존 오픈소스 Claude 플러그인이 있지만 디자인이 마음에 들지 않아 직접 제작.

**학습 목표**: Obsidian 플러그인 제작 전 과정을 배우면서 만들기.

> ⚠️ 설계 결정 (2026-06-22): 데이터 출처를 **Anthropic Admin API → 로컬 파일**로 변경.
> Admin API는 키+크레딧이 필요하고 API 사용량만 보여줌. 사용자는 Claude Code/구독
> 사용량을 원하므로, 키·크레딧 없이 `~/.claude/` 로컬 파일을 읽는 방식으로 전환.

## 기능 목표

- `~/.claude/`의 로컬 사용 기록에서 Claude Code/구독 사용량 추출 (키·크레딧 불필요)
- Obsidian 내에서 바(bar) 형태로 사용량 시각화
- **1순위 바: 최근 5시간 롤링 윈도우** (사용률 %, 메시지 수, 리셋까지 남은 시간)
- (이후) 일별 추이 / 주간 누적 바 추가
- 설정 패널에서 플랜(Pro/Max) 및 갱신 주기 설정

> 5시간 윈도우 %는 "한도"가 필요한데 Anthropic이 정확한 한도를 비공개로 둠.
> → 설정에서 플랜(Pro / Max 5x / Max 20x)을 고르면 대략적 한도를 추정해서 % 계산.
> 윈도우 시작: 첫 활동 timestamp 기준 5시간 블록(ccusage 방식 참고).

## 데이터 출처 (로컬, `~/.claude/`)

### ① `stats-cache.json` — 집계 통계 (과거용)
- `dailyActivity[]`: 날짜별 messageCount/sessionCount/toolCallCount
- `dailyModelTokens[]`: 날짜별 모델별 토큰
- `modelUsage{}`: 모델별 input/output/cache 토큰 총합
- ⚠️ `lastComputedDate` 기준으로 **주기적으로만 갱신** → 실시간 아님

### ② `projects/<인코딩된-cwd>/<세션UUID>.jsonl` — 원본 기록 (실시간)
- 각 줄이 JSON 객체. assistant 메시지(`type: "assistant"`)에 `message.usage` 존재:
  ```json
  {"input_tokens":2,"cache_creation_input_tokens":7337,
   "cache_read_input_tokens":15536,"output_tokens":231, ...}
  ```
- 각 줄에 `timestamp`(ISO 8601) → 시간 윈도우(5h/주간) 집계 가능
- 실시간 사용량은 이 파일들을 파싱해서 계산

### 핵심 제약
- `~/.claude/`는 **Vault 바깥** → Obsidian 파일 API 불가. Node `fs` + `os.homedir()` 사용.
- 따라서 **데스크톱 전용** (`manifest.json`에 `isDesktopOnly: true`). 모바일 불가.

## 기술 스택

- **언어**: TypeScript
- **번들러**: esbuild (Obsidian 공식 권장)
- **데이터**: 로컬 파일 (Node `fs`, `os.homedir`, `path`)
- **Obsidian API**: Plugin, PluginSettingTab, ItemView, Notice

## 디렉토리 구조 (목표)

```
obsidian_claude_plugin/
├── src/
│   ├── main.ts          # 플러그인 진입점
│   ├── settings.ts      # 설정 탭 UI
│   ├── usage.ts         # ~/.claude 로컬 파일 파싱 & 집계
│   ├── view.ts          # 사용량 바 뷰
│   └── types.ts         # TypeScript 타입 정의
├── styles.css           # 플러그인 CSS
├── manifest.json        # Obsidian 플러그인 메타데이터
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── CLAUDE.md
```

## 개발 원칙

### 학습 중심 개발
- 각 주요 기능 구현 전에 **왜 이렇게 하는지** 설명
- 새로운 개념이 나올 때마다 간단한 설명 제공
- Obsidian API의 핵심 패턴은 처음 쓸 때 설명

### 문서화 규칙
- 코드에 주석은 최소화 (WHY가 비자명한 경우만)
- 대신 구현 후 `docs/` 폴더에 학습 노트 작성
- 각 단계별로 무엇을 배웠는지 기록

### 코드 스타일
- 주석은 WHY가 비자명한 경우만 작성
- 변수명/함수명으로 WHAT을 설명
- TypeScript strict mode 사용
- 에러 처리는 파일 I/O(로컬 파일 읽기/파싱)에 적용

## Obsidian 플러그인 핵심 개념 (참고)

### 플러그인 생명주기
```typescript
// Obsidian은 Plugin 클래스를 상속받아 만든다
class MyPlugin extends Plugin {
  async onload() { /* 플러그인 활성화 시 */ }
  onunload() { /* 플러그인 비활성화 시 */ }
}
```

### 주요 API
- `this.addRibbonIcon()` - 사이드바 아이콘 추가
- `this.addCommand()` - 커맨드 팔레트에 명령 추가
- `this.addSettingTab()` - 설정 탭 추가
- `this.registerView()` - 커스텀 뷰 등록
- `requestUrl()` - 외부 HTTP 요청 (fetch 대신 사용)

## 개발 진행 상황

### Phase 1: 프로젝트 초기 셋업
- [x] package.json, tsconfig.json, esbuild 설정
- [x] manifest.json + versions.json 작성
- [x] 기본 Plugin 클래스 뼈대 작성 (리본 아이콘 + Notice)
- [x] `npm install` + `npm run build` 통과 (main.js 생성 확인)
- [x] Obsidian vault에 junction 연결 (vault 경로 확보)
- [x] Obsidian에서 플러그인 활성화 후 리본 아이콘 동작 확인 ✅ Phase 1 완료

### 개발 환경 메모
- Vault 경로: `C:\Users\louis\OneDrive\문서\Obsidian Vault`
- 플러그인 junction: `<Vault>\.obsidian\plugins\claude-usage-bar` → 이 작업 폴더
- 빌드: `npm run dev`(watch) 또는 `npm run build`(1회). 빌드하면 junction 통해 Vault에 즉시 반영
- 코드 수정 후 Obsidian에서 보려면: 빌드 → Obsidian에서 플러그인 reload (또는 Cmd/Ctrl+R)

### Phase 2: 로컬 사용량 데이터 파싱 ✅
- [x] `~/.claude/projects/**/*.jsonl` 파일 목록 수집 (`findTranscriptFiles`)
- [x] assistant 메시지의 `message.usage` + timestamp 추출 (`parseUsageEntries`, message.id로 중복 제거)
- [x] 5시간 세션 블록 분할 (`buildBlocks`) + 현재 윈도우 계산 (`getCurrentWindow`)
- [x] 실제 데이터로 검증 (scripts/test-usage.ts, Obsidian 없이 node로 실행)
- [x] 리본 클릭 시 실제 사용량을 Notice로 표시 (Obsidian 런타임 검증)
- 설계: usage.ts는 순수(Node fs만) → UI와 데이터 로직 분리, 단독 테스트 가능

### Phase 3: UI 구현
- [ ] 커스텀 뷰(View) 등록
- [ ] 사용량 바 차트 HTML/CSS 구현
- [ ] 자동 갱신 타이머

## 작업 기록

작업 기록은 `docs/progress/` 에 날짜별로 저장.
