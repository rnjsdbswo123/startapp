# startapp — 크롬 시작 페이지

GitHub Pages(정적 페이지) + Supabase(데이터 저장). 구글 계정으로 로그인하면 어느 PC에서든 같은 북마크가 보이고, 한 쪽에서 수정하면 다른 쪽에 실시간 반영됩니다.

## 1. Supabase 설정 (한 번만)

1. https://supabase.com 에서 새 프로젝트 생성 (무료 플랜, 리전은 Northeast Asia 추천)
2. **SQL Editor** → `supabase/schema.sql` 내용 붙여넣고 Run
3. 로그인은 이메일 매직 링크(기본 Email provider)를 사용. 별도 설정 없음.
4. **Authentication → URL Configuration**
   - Site URL: `https://rnjsdbswo123.github.io/startapp/`
   - Redirect URLs: 위 주소와 `http://localhost:3000/` 둘 다 추가
5. **Project Settings → API** 에서 Project URL과 anon public key를 복사해 `config.js`에 입력

## 2. 로컬 테스트

```bash
python3 -m http.server 3000
```
브라우저에서 http://localhost:3000 열기. (file:// 로 열면 로그인이 안 됩니다)

## 3. GitHub Pages 배포

```bash
git init && git add . && git commit -m "init"
gh repo create startapp --public --source=. --push
```
GitHub 저장소 → Settings → Pages → Branch: `main` / `(root)` 저장.
몇 분 뒤 `https://rnjsdbswo123.github.io/startapp/` 에서 열립니다.

## 4. 크롬 설정 (PC마다 한 번, 설정 자체는 계정 동기화됨)

- 시작 페이지: 설정 → 시작 그룹 → 특정 페이지 열기 → 위 주소
- 새 탭까지 바꾸려면: 웹스토어에서 "New Tab Redirect" 설치 후 위 주소 지정

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 페이지 구조 |
| `style.css` | 스타일 (Claude Design 결과물로 교체 예정) |
| `app.js` | 이메일 매직링크 로그인, 북마크 CRUD, 실시간 동기화 |
| `config.js` | Supabase URL / anon key |
| `supabase/schema.sql` | 테이블 + RLS 정책 |
