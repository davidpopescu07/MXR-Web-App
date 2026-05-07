import './App.css';
import * as React from 'react';
import Navbar from "./Components/LandingPage/Navbar/Navbar";
import {Routes, Route} from "react-router";
import LandingPage from "./Components/LandingPage/LandingPage";
import MixerPage from "./Components/MixerPage/MixerPage";
import Login from "./Components/AuthenticationPages/LoginPage/Login";
import Signup from "./Components/AuthenticationPages/SignupPage/Signup";
import AboutPage from "./Components/AboutPage/AboutPage";
import Cookies from "js-cookie";
import CookiesBanner from './Components/LandingPage/Navbar/Cookies/CookiesBanner'
import {useState} from "react";

const App = () => {


    const [cookiesAccepted, setCookiesAccepted] = useState(
        () => Cookies.get('cookies-accepted') === 'true'
    );

    const handleAccept = () => {
        Cookies.set('cookies-accepted', 'true', { expires: 365 });
        setCookiesAccepted(true);
    };
    let Component
    switch (window.location.pathname) {
        case "/":
            Component = <LandingPage/>
            break
        case "/mixer":
            Component = <MixerPage/>
            break
    }

    return (
        <div>
            <Navbar/>
            {!cookiesAccepted && <CookiesBanner onAccept={handleAccept}/>}
            <Routes>
                <Route path="/" element={<LandingPage/>}/>
                <Route path="/mixer" element={<MixerPage/>}/>
                <Route path="/about" element={<AboutPage/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/signup" element={<Signup/>}/>
            </Routes>
        </div>
    );
}

export default App;
