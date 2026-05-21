import './App.css';
import * as React from 'react';
import Navbar from "./Components/LandingPage/Navbar/Navbar";
import {Navigate, Routes, Route, useLocation} from "react-router";
import LandingPage from "./Components/LandingPage/LandingPage";
import MixerPage from "./Components/MixerPage/MixerPage";
import Login from "./Components/AuthenticationPages/LoginPage/Login";
import Signup from "./Components/AuthenticationPages/SignupPage/Signup";
import AboutPage from "./Components/AboutPage/AboutPage";
import AdminPage from "./Components/AdminPage/AdminPage";
import Cookies from "js-cookie";
import CookiesBanner from './Components/LandingPage/Navbar/Cookies/CookiesBanner'
import {useEffect, useState} from "react";
import { api } from "./Api";

const ProtectedRoute = ({ authReady, currentUser, children }) => {
    const location = useLocation();

    if (!authReady) return null;
    if (!currentUser) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
};

const AdminRoute = ({ authReady, currentUser, children }) => {
    if (!authReady) return null;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (currentUser.role !== "ADMIN") return <Navigate to="/mixer" replace />;

    return children;
};

const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [cookiesAccepted, setCookiesAccepted] = useState(
        () => Cookies.get('cookies-accepted') === 'true'
    );

    const handleAccept = () => {
        Cookies.set('cookies-accepted', 'true', { expires: 365 });
        setCookiesAccepted(true);
    };

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const user = await api.me();
                if (active) setCurrentUser(user);
            } catch {
                if (active) setCurrentUser(null);
            } finally {
                if (active) setAuthReady(true);
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const handleExpiredAuth = () => {
            setCurrentUser(null);
        };

        window.addEventListener("auth:expired", handleExpiredAuth);
        return () => window.removeEventListener("auth:expired", handleExpiredAuth);
    }, []);

    return (
        <div>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser}/>
            {!cookiesAccepted && <CookiesBanner onAccept={handleAccept}/>}
            <Routes>
                <Route path="/" element={<LandingPage/>}/>
                <Route path="/mixer" element={
                    <ProtectedRoute authReady={authReady} currentUser={currentUser}>
                        <MixerPage/>
                    </ProtectedRoute>
                }/>
                <Route path="/about" element={<AboutPage/>}/>
                <Route path="/login" element={<Login currentUser={currentUser} setCurrentUser={setCurrentUser} authReady={authReady}/>}/>
                <Route path="/signup" element={<Signup currentUser={currentUser} setCurrentUser={setCurrentUser} authReady={authReady}/>}/>
                <Route path="/admin" element={
                    <AdminRoute authReady={authReady} currentUser={currentUser}>
                        <AdminPage currentUser={currentUser}/>
                    </AdminRoute>
                }/>
            </Routes>
        </div>
    );
}

export default App;
