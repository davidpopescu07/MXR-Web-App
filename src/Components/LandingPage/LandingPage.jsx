import React from 'react'
import LandingPageImage from "./LandingPageStuff/LandingPageImage/LandingPageImage";
import MainTopicLandingPage from "./LandingPageStuff/MainTopicLandingPage/MainTopicLandingPage";

const LandingPage = () => {
    return (
        <div>
            <div style={{display: 'flex'}}>
                <MainTopicLandingPage/>
                <LandingPageImage/>
            </div>

        </div>
    )
}

export default LandingPage