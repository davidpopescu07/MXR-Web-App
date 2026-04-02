import React from 'react'
import './Login.css'

const Login = () => {
    return (<div className="Page">

        <div className="LoginContainer">
            <div className="LoginText">
                <h1> Log into your account </h1>
                <h3> Don't have an account? Sign up</h3>
            </div>
            <div className="LoginUserInput">
                <div className="InputField">
                    <label htmlFor="email">Email</label>
                    <input type="text" name="uname" required/>
                </div>

                <div className="InputField">
                    <label htmlFor="psw">Password</label>
                    <input type="password" name="psw" required/>
                </div>
                <button type="submit" id="loginButton">Log in</button>
            </div>
        </div>
    </div>);
}

export default Login;