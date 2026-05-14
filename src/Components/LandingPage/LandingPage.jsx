import React from 'react'
import LandingPageImage from "./LandingPageStuff/LandingPageImage/LandingPageImage";
import MainTopicLandingPage from "./LandingPageStuff/MainTopicLandingPage/MainTopicLandingPage";

const LandingPage = () => {
    return (
        <div className="landing-page">
            <div className="landing-page-layout">
                <MainTopicLandingPage/>
                <LandingPageImage/>
            </div>

        </div>
    )
}

export default LandingPage
