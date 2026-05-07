import React from 'react';
import './CookiesBanner.css';

const CookiesBanner = ({ onAccept }) => {
    return (
        <div className="cookie-banner">
            <p>We use cookies to remember your preferences...
            </p>
            <button onClick={onAccept}>Accept</button>
        </div>
    );
};

export default CookiesBanner;