export function AdminLoginScreen() {
  return (
    <main className="admin-login-screen">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <a className="admin-login-action" href="/cdn-cgi/access/login?returnTo=%2Fadmin">
          Cloudflare Access로 로그인
        </a>
        <p className="admin-eyebrow">Aether CMS · Private workspace</p>
        <h1 id="admin-login-title">관리자 로그인이 필요합니다.</h1>
        <p>
          이 공간은 Cloudflare Access로 보호됩니다. 운영 도메인에서 인증을
          완료한 뒤 다시 접속해 주세요.
        </p>
        <a className="admin-login-back" href="/home">
          공개 사이트로 돌아가기
        </a>
        <small>인증 없이 관리자 API와 콘텐츠 편집 기능은 사용할 수 없습니다.</small>
      </section>
    </main>
  );
}
