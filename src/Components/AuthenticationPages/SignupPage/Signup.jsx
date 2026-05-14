import React, { useEffect, useState } from "react";
import "./Signup.css";
import { Link, useNavigate } from "react-router";
import { api } from "../../../Api";

const Signup = ({ currentUser, setCurrentUser, authReady }) => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
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
        setError("");

        if (email !== confirmEmail) {
            setError("email addresses do not match");
            return;
        }

        setSubmitting(true);
        try {
            const user = await api.signup({ username, email, password });
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
            <div className="SignupContainer">
                <div className="SignupText">
                    <h1> Create account </h1>
                    <h3><Link to="/login">Existing account? Log in</Link></h3>
                </div>
                <form className="SignupUserInput" onSubmit={handleSubmit}>
                    <div className="InputField">
                        <label htmlFor="username">Username</label>
                        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required/>
                    </div>

                    <div className="InputField">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                    </div>

                    <div className="InputField">
                        <label htmlFor="confirmEmail">Confirm Email</label>
                        <input id="confirmEmail" type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} required/>
                    </div>

                    <div className="InputField">
                        <label htmlFor="psw">Password</label>
                        <input id="psw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                    </div>
                    {error && <p className="auth-message auth-error">{error}</p>}
                    <button type="submit" id="signupBttn" disabled={submitting}>
                        {submitting ? "Creating..." : "Sign up"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Signup;
