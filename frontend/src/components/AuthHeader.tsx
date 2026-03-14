import { Link } from "react-router-dom";

export default function AuthHeader() {
  return (
    <header className="landingKoelogs__header authPage__header">
      <div className="landingKoelogs__shell landingKoelogs__headerInner">
        <Link to="/lp" className="landingKoelogs__brand">
          Koelogs
        </Link>

        <nav className="landingKoelogs__nav authPage__desktopNav" aria-label="Auth navigation">
          <Link to="/help/guide" className="landingKoelogs__navLink">
            使い方
          </Link>
          <Link to="/log" className="landingKoelogs__navLink">
            ゲストで試す
          </Link>
        </nav>
      </div>
    </header>
  );
}
