import React from 'react';
import './Navbar.css';
import {Link} from "react-router"

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-left">


                <img className="logo" src="/images/MXR_DarkTheme_TransparentBackground.svg" alt="MXR-Logo" height="56"/>
                <Link to="/">
                    <h1 id="appName"> MXR </h1>
                </Link>
            </div>
            <div className="navbar-center">
                <ul className="navbar-center-links">
                    <Link className="navbar-element" to="/mixer">
                        Mixer
                    </Link>
                    <Link className="navbar-element" to="/playlists">
                        Playlists
                    </Link>
                    <Link className="navbar-element" to="statistics">
                        Statistics
                    </Link>
                    <Link className="navbar-element" to="/samples">
                        Samples
                    </Link>
                    <Link className="navbar-element" to="/about">
                        About
                    </Link>
                </ul>
            </div>
            <div className="navbar-right">
                <Link id="login" to="/login" className="login-button">
                    Login
                </Link>
                <Link id="signupButton" to="/signup" className="signup-button">
                    Sign up
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;

//
// import React from 'react';
// import './Navbar.css';
// import {Link} from "react-router"
//
// const Navbar = () => {
//     return (
//         <nav className="navbar">
//             <div className="navbar-left">
//                 <img className="logo" src="/images/MXR_DarkTheme_TransparentBackground.svg" alt="MXR-Logo" height="56"/>
//                 <h1 id="appName"> MXR </h1>
//             </div>
//             <div className="navbar-center">
//                 <ul className="navbar-center-links">
//                     <li className="navbar-element">
//                         <a> Mixer </a>
//                     </li>
//                     <li className="navbar-element">
//                         <a> Playlists </a>
//                     </li>
//                     <li className="navbar-element">
//                         <a> Statistics </a>
//                     </li>
//                     <li className="navbar-element">
//                         <a> Samples </a>
//                     </li>
//                     <li className="navbar-element">
//                         <a> About </a>
//                     </li>
//
//                 </ul>
//             </div>
//             <div className="navbar-right">
//                 <a id="loginButton"> Login</a>
//                 <button id="signupButton"> <a> Sign up </a> </button>
//             </div>
//         </nav>
//     );
// };
//
// export default Navbar;