# 2026-06-22 — Phase 2: 로컬 사용량 데이터 파싱

## 한 일
- `src/types.ts`: UsageEntry / SessionBlock / CurrentWindow 타입 정의
- `src/usage.ts`: 로컬 파일 파싱 + 5시간 블록 + 현재 윈도우 계산
- `scripts/test-usage.ts`: 실제 데이터 검증 스크립트
- `src/main.ts`: 리본 클릭 시 실제 사용량 Notice 표시
- 검증 결과: 30개 파일 → 554 엔트리 → 22 블록, 현재 윈도우 73메시지/3.34M토큰/리셋까지 4h25m

## 배운 것

### "세션 블록" 모델 (Claude 구독 한도 방식)
- 구독 한도는 슬라이딩 윈도우가 아니라 **5시간 블록**. 첫 메시지에 창이 열리고 5h 뒤 리셋.
- 그래서 "리셋까지 N분"을 계산할 수 있음 (슬라이딩이면 단일 리셋 시각이 없음).
- 블록 분할 규칙: 블록 시작 후 5h 경과 OR 직전 메시지와 5h 이상 간격 → 새 블록.
- 블록 시작은 첫 메시지의 "정시(hour)"로 내림 → Claude가 보여주는 리셋 시각과 맞춤(근사).

### 중복 제거
- 같은 assistant 메시지가 여러 파일/줄에 중복 기록될 수 있음.
- `message.id`를 Set으로 추적해서 한 번만 카운트.

### 설계 원칙: 순수 로직과 UI 분리
- `usage.ts`는 `obsidian`을 import하지 않고 Node `fs`만 사용 → **순수 함수**.
- 덕분에 Obsidian 없이 esbuild로 번들해서 `node`로 단독 테스트 가능.
- UI(Obsidian 의존)는 `main.ts`에만. 데이터 로직 바뀌어도 UI 테스트 불필요.

### 단독 테스트 방법 (재현용)
```
npx esbuild scripts/test-usage.ts --bundle --platform=node --format=cjs --outfile=tmp-test.cjs
node tmp-test.cjs
```
- `--platform=node`: Node 내장 모듈(fs/path/os)을 그대로 쓰게 함.

## 알아둘 점 / 다음 결정
- 현재는 토큰 합 = input+output+cacheCreation+cacheRead (캐시 read는 실제론 저렴 → 한도 가중치와 다름).
- % 표시는 "한도" 필요 → 다음 Phase에서 플랜(Pro/Max) 설정으로 한도 추정.

## 다음 단계 (Phase 3: UI 바)
- 커스텀 View 또는 status bar에 막대 그리기
- 플랜 설정 추가 → % 계산
- 자동 갱신 타이머
