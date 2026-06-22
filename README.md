# Claude Usage Bar

Obsidian 사이드바에 내 **Claude Code 사용량**을 막대(bar)로 보여주는 플러그인.
API 키나 크레딧 없이, 내 컴퓨터의 로컬 사용 기록(`~/.claude/`)만 읽어서 표시한다.

> 만드는 과정을 단계별로 기록한 학습 노트는 [`docs/progress/`](docs/progress/) 에 있다.

## 기능

- **최근 5시간** / **주간** 사용률을 막대로 표시
- 각 막대에 사용률(%), 토큰, 메시지 수, **리셋까지 남은 시간**과 리셋 시각 표시
- 플랜(Pro / Max 5x / Max 20x) 선택 → 추정 한도 자동 설정
- **보정 기능**: Claude 앱이 보여주는 실제 %를 입력하면 한도를 역산해 정확히 맞춤
- 사용률에 따른 색상(정상/경고/위험), 자동 갱신

## 동작 방식

데이터 출처는 `~/.claude/projects/**/*.jsonl` — Claude Code의 로컬 대화 기록이다.
각 assistant 메시지의 `usage`(토큰)와 `timestamp`를 읽어, 5시간/주간 **세션 블록**으로
묶고 현재 윈도우의 사용량을 계산한다.

토큰은 단순 합산하지 않고 **비용 가중**한다(`input×1, output×5, cacheCreate×1.25, cacheRead×0.1`).
코딩 세션은 `cache_read`가 토큰의 90%+를 차지하는데, Claude 실제 한도는 cache 읽기를 크게
할인하기 때문이다.

## ⚠️ 제약

- **Claude Code(CLI) 사용량만** 집계한다. claude.ai 웹/데스크톱/모바일 **앱 사용량은 포함되지 않는다**
  (앱 사용은 서버에서만 처리돼 로컬에 기록이 없다). 단, 구독 한도는 앱과 공유되므로 앱을 많이
  쓰면 실제보다 낮게 표시될 수 있다.
- 윈도우 한도는 **추정치**다. Anthropic이 정확한 값을 공개하지 않아, 설정의 "보정"으로 맞춘다.
- **데스크톱 전용** (`isDesktopOnly`). 모바일은 로컬 파일 접근이 안 된다.

## 설치 (수동)

1. 이 저장소를 빌드한다.
   ```bash
   npm install
   npm run build
   ```
2. `main.js`, `manifest.json`, `styles.css` 를 vault의
   `.obsidian/plugins/claude-usage-bar/` 폴더에 복사한다.
3. Obsidian 설정 → Community plugins 에서 **Claude Usage Bar** 를 켠다.
4. 왼쪽 리본의 막대그래프 아이콘을 클릭하면 사이드바 패널이 열린다.

### 개발 (핫 리로드)

작업 폴더를 vault 플러그인 폴더로 심볼릭 링크(또는 junction)하면 빌드가 바로 반영된다.

```bash
npm run dev      # esbuild watch 모드
```

```powershell
# Windows 예시 (관리자 권한 불필요)
New-Item -ItemType Junction `
  -Path "<Vault>\.obsidian\plugins\claude-usage-bar" `
  -Target "<이 저장소 경로>"
```

## 사용법

1. 리본 아이콘 또는 명령 팔레트 `Claude 사용량 패널 열기` 로 패널을 연다.
2. 설정에서 **플랜**을 실제 요금제로 선택한다.
3. 더 정확히 맞추려면 **보정** 섹션에서 Claude 앱의 실제 %를 입력한다.

## 프로젝트 구조

```
src/
  main.ts       # 플러그인 진입점 (뷰 등록, 설정, 자동 갱신)
  view.ts       # 사이드바 패널 UI (ItemView)
  settings.ts   # 설정 탭 + 플랜/보정
  usage.ts      # ~/.claude 파싱, 세션 블록, 윈도우 계산 (순수 함수)
  types.ts      # 타입 정의
scripts/
  test-usage.ts # 실데이터 검증
  diagnose.ts   # 토큰 구성 진단
docs/progress/  # 단계별 학습 노트
```

## 라이선스

MIT
