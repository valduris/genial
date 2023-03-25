export function Navigation() {
    return (
        <nav className="navbar is-transparent" role="navigation" aria-label="main navigation">
            <div className="navbar-brand">
                <a className="navbar-item" href="localhost:3000">
                    <img src={require("./navigationLogo.png")} width="112" height="28" />
                </a>
                <a role="button" className="navbar-burger" aria-label="menu" aria-expanded="false"
                   data-target="navbarBasicExample">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                </a>
            </div>
            <div className="navbar-menu">
                <div className="navbar-start">
                    <a className="navbar-item is-active">Play!</a>
                    <a className="navbar-item">Rules</a>
                </div>
                <div className="navbar-end">
                    <div className="navbar-item">
                        <div className="buttons">
                            <a className="button is-primary"><strong>Sign up</strong></a>
                            <a className="button is-light">Log in</a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}