# Obsidian Claude Usage Plugin

## 프로젝트 개요

Obsidian 플러그인으로 Anthropic 계정의 Claude API 사용량을 시각적 바(bar) 형태로 표시한다.
기존 오픈소스 Claude 플러그인이 있지만 디자인이 마음에 들지 않아 직접 제작.

**학습 목표**: Obsidian 플러그인 제작 전 과정을 배우면서 만들기.

## 기능 목표

- Anthropic API를 통해 Claude 사용량(토큰, 비용 등) 조회
- Obsidian 내에서 바(bar) 차트 형태로 사용량 시각화
- 일별/월별 사용량 표시
- 설정 패널에서 API 키 입력 및 갱신 주기 설정

## 기술 스택

- **언어**: TypeScript
- **번들러**: esbuild (Obsidian 공식 권장)
- **API**: Anthropic Usage API
- **Obsidian API**: Plugin, PluginSettingTab, ItemView, Notice, requestUrl

## 디렉토리 구조 (목표)

```
obsidian_claude_plugin/
├── src/
│   ├── main.ts          # 플러그인 진입점
│   ├── settings.ts      # 설정 탭 UI
│   ├── api.ts           # Anthropic API 호출
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
- 에러 처리는 외부 API 호출(Anthropic API)에만 적용

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
- [ ] package.json, tsconfig.json, esbuild 설정
- [ ] manifest.json 작성
- [ ] 기본 Plugin 클래스 뼈대 작성
- [ ] Obsidian vault에 심볼릭 링크로 연결해서 테스트

### Phase 2: Anthropic API 연동
- [ ] 설정 탭에서 API 키 저장
- [ ] Anthropic Usage API 호출
- [ ] 사용량 데이터 파싱

### Phase 3: UI 구현
- [ ] 커스텀 뷰(View) 등록
- [ ] 사용량 바 차트 HTML/CSS 구현
- [ ] 자동 갱신 타이머

## 작업 기록

작업 기록은 `docs/progress/` 에 날짜별로 저장.
