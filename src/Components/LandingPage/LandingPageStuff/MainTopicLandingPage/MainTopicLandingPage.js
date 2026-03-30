import React from 'react'
import './MainTopicLandingPage.css'
import {Link} from "react-router";

const MainTopicLandingPage = () => {
    return (
        <div className="TextBox">
            <div className="MainTopic">
                <h1> Music makes the <br/> people come together </h1>
            </div>
            <div className="SubTopic">
                <h2> Mix tracks together and create unique sounds with MXR, an app
                    made for (bedroom) DJS that can be used by all music enthusiasts to bring their own ideas to
                    life.</h2>
            </div>
            <Link id="MixOnlineButton" to="/mixer"> Mix online with MXR </Link>
        </div>
    )
}

export default MainTopicLandingPage;