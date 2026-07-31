# 통합 백업 복원 안내

1. 이 백업이 보장하는 범위

이 백업은 소스 코드, Git 기록, 잠금 파일, 빌드 결과, 로컬 `.wrangler` 상태, 마이그레이션, 공개 이미지와 복원 도구를 포함합니다. 새 컴퓨터에서는 운영체제에 맞는 패키지를 `package-lock.json` 기준으로 다시 설치하고 동일한 빌드를 검증합니다.

Cloudflare 운영 D1 데이터와 R2 객체는 원격 서비스에 있으므로 ZIP만으로 복원되지 않습니다. 현재 프로젝트는 운영 배포를 취소한 상태이며, 백업에는 로컬 개발 상태만 포함됩니다.

2. 필수 준비

Node.js 22.13.0 이상과 인터넷 연결이 필요합니다. Node.js는 [공식 다운로드 페이지](https://nodejs.org/en/download)에서 설치합니다. 복원 도구는 반복 가능한 설치를 위해 [npm ci](https://docs.npmjs.com/cli/v8/commands/npm-ci/)를 사용합니다.

3. Windows 복원

ZIP을 짧은 영문 경로에 풉니다. 예: `C:\work\landing_apple`.

PowerShell에서 프로젝트 폴더로 이동한 후 다음 명령을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\restore-windows.ps1
```

4. macOS 복원

ZIP을 푼 프로젝트 폴더에서 다음 명령을 실행합니다.

```bash
bash ./restore-macos.command
```

5. 복원 도구가 확인하는 항목

1. Node.js 최소 버전
2. `package-lock.json` 기반의 정확한 패키지 설치
3. Vinext 프로덕션 빌드
4. ESLint 정적 검사
5. 관리자·홈·Worker·D1/R2 설정 파일 존재 여부
6. 직접 의존성의 설치 버전 일치 여부
7. Drizzle SQL 마이그레이션 존재 여부

진단 로그와 최종 결과는 `.restore/` 폴더에 저장됩니다.

6. 로컬 실행

복원 성공 후 다음 명령으로 개발 서버를 실행합니다.

```bash
npm run dev
```

기본 접속 주소는 터미널에 표시됩니다. 관리자 로컬 우회가 필요한 격리된 개발 환경에서만 `.env.example`을 `.env.local`로 복사하고 값을 검토합니다. `ADMIN_TEST_BYPASS=true`는 공개 환경에서 사용하지 않습니다.

7. Cloudflare 데이터 복원 한계

D1 운영 데이터는 Cloudflare의 [D1 가져오기·내보내기 안내](https://developers.cloudflare.com/d1/best-practices/import-export-data/)에 따라 별도의 SQL 내보내기가 필요합니다. R2 운영 객체는 [R2 객체 다운로드 안내](https://developers.cloudflare.com/r2/objects/download-objects/)에 따라 별도로 내려받아야 합니다. 인증 토큰이나 비밀번호는 백업 문서에 기록하지 않습니다.

8. 알려진 테스트 제한

기존 Node 단위 테스트는 TypeScript와 `cloudflare:` 전용 모듈을 일반 Node 로더로 직접 읽어 실패합니다. 복원 성공 여부는 전체 Vinext 빌드, 정적 검사, 산출물 검증으로 판단합니다. 공개 동작 검증은 Cloudflare 호환 런타임에서 수행해야 합니다.