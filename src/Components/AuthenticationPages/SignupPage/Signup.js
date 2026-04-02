import React from 'react'
import './Signup.css'

const Signup = () => {
    return (<div className="Page">

        <div className="SignupContainer">
            <div className="SignupText">
                <h1> Create account </h1>
                <h3> Existing account? Log in</h3>
            </div>
            <div className="SignupUserInput">
                <div className="InputField">
                    <label htmlFor="email">Email</label>
                    <input type="text" name="uname" required/>
                </div>

                <div className="InputField">
                    <label htmlFor="email">Confirm Email</label>
                    <input type="text" name="uname" required/>
                </div>

                <div className="InputField">
                    <label htmlFor="psw">Password</label>
                    <input type="password" name="psw" required/>
                </div>
                <button type="submit" id="signupBttn">Sign up</button>
            </div>
        </div>
    </div>);
}

export default Signup;