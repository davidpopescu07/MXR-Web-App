import React, { useEffect, useState } from "react";
import "./Login.css";
import { Link, useNavigate } from "react-router";
import { api } from "../../../Api";

const Login = ({ currentUser, setCurrentUser, authReady }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (authReady && currentUser) {
            navigate("/mixer");
        }
    }, [authReady, currentUser, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const user = await api.login({ email, password });
            setCurrentUser(user);
            navigate("/mixer");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="Page">
            <div className="LoginContainer">
                <div className="LoginText">
                    <h1> Log into your account </h1>
                    <h3> <Link to="/signup">Don&apos;t have an account? Sign up</Link></h3>
                </div>
                <form className="LoginUserInput" onSubmit={handleSubmit}>
                    <div className="InputField">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                    </div>

                    <div className="InputField">
                        <label htmlFor="psw">Password</label>
                        <input id="psw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                    </div>
                    {error && <p className="auth-message auth-error">{error}</p>}
                    <button type="submit" id="loginButton" disabled={submitting}>
                        {submitting ? "Logging in..." : "Log in"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
