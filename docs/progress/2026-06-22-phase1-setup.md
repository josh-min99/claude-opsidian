# 2026-06-22 — Phase 1: 프로젝트 초기 셋업

## 한 일
- 설정 파일 4종 작성: manifest.json, package.json, tsconfig.json, esbuild.config.mjs
- versions.json 작성
- src/main.ts 최소 뼈대 작성 (리본 아이콘 + Notice)
- `npm install` (18 패키지) + `npm run build` 통과 → main.js 생성 확인

## 배운 것

### Obsidian은 main.js 하나만 읽는다
- Obsidian은 TypeScript를 직접 실행 못 함. `main.js` 단일 파일만 로드.
- esbuild가 `src/*.ts` 여러 개를 `main.js` 하나로 번들링.
- 그래서 빌드 산출물 main.js는 .gitignore에 넣음 (소스에서 매번 생성).

### 설정 파일 4개의 역할
| 파일 | 역할 |
|------|------|
| manifest.json | 플러그인 주민등록증. id/name/version/minAppVersion/isDesktopOnly |
| package.json | 의존성 목록 + npm 스크립트(dev=watch, build=타입체크+번들) |
| tsconfig.json | TS→JS 변환 규칙. strict 모드 켬 |
| esbuild.config.mjs | 번들러 설정. obsidian/electron/node builtin은 external 처리 |

### esbuild의 external 처리가 왜 중요한가
- `obsidian`, `electron`, node 내장 모듈(fs 등)은 **번들에 포함하지 않음**.
- 이들은 Obsidian 런타임이 이미 제공 → 런타임에 빌려쓰면 됨.
- 번들에 넣으면 용량 낭비 + 충돌. 그래서 external 목록에 넣음.

### npm 스크립트 두 개
- `npm run dev`: esbuild watch 모드. 파일 수정 시 자동 재빌드 (개발용)
- `npm run build`: `tsc -noEmit`(타입 검사만) + 프로덕션 번들 (배포용)

## 다음 단계
- Vault에 플러그인 연결해서 실제 로드 테스트 (vault 경로 필요)
- 연결되면 리본의 막대그래프 아이콘 클릭 → "살아있습니다 👋" Notice 확인
- 이후 Phase 2: ~/.claude 로컬 파일 파싱
