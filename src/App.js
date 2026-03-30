// React example
// See https://github.com/katspaugh/wavesurfer-react
import './App.css';
import * as React from 'react';
import Navbar from "./Components/LandingPage/Navbar/Navbar";
import PlaylistTable from "./Components/PlaylistTable/PlaylistTable";
import {Routes, Route} from "react-router";
import LandingPage from "./Components/LandingPage/LandingPage";

const App = () => {

    let Component
    switch(window.location.pathname) {
        case "/":
            Component = <LandingPage/>
            break
        case "/mixer":
            Component = <PlaylistTable/>
            break
    }
    return (
        <div>
            <Navbar/>
            <Routes>
                <Route path="/" element={<LandingPage/>}/>
                <Route path="/mixer" element={<PlaylistTable/>}/>
            </Routes>
        </div>
    );
}

export default App;
