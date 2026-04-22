// React example
// See https://github.com/katspaugh/wavesurfer-react
import './App.css';
import * as React from 'react';
import Navbar from "./Components/LandingPage/Navbar/Navbar";
import {Routes, Route} from "react-router";
import LandingPage from "./Components/LandingPage/LandingPage";
import MixerPage from "./Components/MixerPage/MixerPage";
import Login from "./Components/AuthenticationPages/LoginPage/Login";
import Signup from "./Components/AuthenticationPages/SignupPage/Signup";
import AboutPage from "./Components/AboutPage/AboutPage";

const App = () => {

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
