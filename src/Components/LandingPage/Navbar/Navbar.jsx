import React, { useState } from 'react';
import './Navbar.css';
import {Link} from "react-router"
import { api } from "../../../Api";

const Navbar = ({ currentUser, setCurrentUser }) => {
    const [logoFailed, setLogoFailed] = useState(false);

    const handleLogout = async () => {
        try {
            await api.logout();
        } finally {
            setCurrentUser(null);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-left">


                {logoFailed ? (
                    <div className="logo logo-fallback" aria-label="MXR logo">MXR</div>
                ) : (
                    <img
                        className="logo"
                        src={`${process.env.PUBLIC_URL || ""}/images/MXR_DarkTheme_TransparentBackground.svg`}
                        alt="MXR-Logo"
                        onError={() => setLogoFailed(true)}
                    />
                )}
                <Link to="/">
                    <h1 id="appName"> MXR </h1>
                </Link>
            </div>
            <div className="navbar-center">
                <ul className="navbar-center-links">
                    <Link className="navbar-element" to="/mixer">
                        Mixer
                    </Link>
                    {/*<Link className="navbar-element" to="/playlists">*/}
                    {/*    Playlists*/}
                    {/*</Link>*/}
                    {/*<Link className="navbar-element" to="/statistics">*/}
                    {/*    Statistics*/}
                    {/*</Link>*/}
                    {/*<Link className="navbar-element" to="/samples">*/}
                    {/*    Samples*/}
                    {/*</Link>*/}
                    {currentUser?.role === "ADMIN" && (
                        <Link className="navbar-element" to="/admin">
                            Admin
                        </Link>
                    )}
                    <Link className="navbar-element" to="/about">
                        About
                    </Link>
                </ul>
            </div>
            <div className="navbar-right">
                {currentUser ? (
                    <>
                        <span className="navbar-user">{currentUser.username}</span>
                        <button type="button" id="logoutButton" onClick={handleLogout}>
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        <Link id="login" to="/login" className="login-button">
                            Login
                        </Link>
                        <Link id="signupButton" to="/signup" className="signup-button">
                            Sign up
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
