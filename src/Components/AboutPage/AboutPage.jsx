import React, { useState } from 'react';
import './AboutPage.css';
import { Link } from 'react-router';

const FEATURES = [
    {
        title: 'Dual decks with live waveforms',
        detail: 'Load any track onto Deck A or Deck B by dragging it from your playlist. Each deck renders a scrolling waveform in real time using WaveSurfer, so you can see exactly where you are in the track.',
    },
    {
        title: 'LOW/MID/HIGH/CFX Knobs + crossfader',
        detail: 'Each deck has its own High, Mid, and Low EQ knobs. The crossfader lets you easily transition from one track to another.',
    },
    {
        title: 'Loop regions & cue points',
        detail: 'Hit IN to mark a loop start, then OUT to close it. A Region is created on the waveform and loops continuously. You also get three hot-cue slots per deck to save timestamps and jump back to them.',
    },
    {
        title: 'Playlist management',
        detail: 'Organise your tracks into named playlists, search by title, artist or album and rate tracks with a five-star system.',
    },
];

const AboutPage = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

    return (
        <div className="about-page">

            <div className="about-hero">
                <p className="about-sub">Features</p>
            </div>

            <div className="about-body">
                <div className="about-features">
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.title}
                            className={`about-feature${openIndex === i ? ' about-feature--open' : ''}`}
                            onClick={() => toggle(i)}
                        >
                            <div className="about-feature-row">
                                <span className="about-feature-dash">—</span>
                                <span className="about-feature-title" style={{fontSize: "18px"}}>{f.title}</span>
                                <span className="about-feature-arrow">{openIndex === i ? '↑' : '↓'}</span>
                            </div>
                            {openIndex === i && (
                                <p className="about-feature-detail" style={{fontSize: "16px"}}>{f.detail}</p>
                            )}
                        </div>
                    ))}
                </div>

                <Link className="about-btn" to="/mixer">Start mixing</Link>
            </div>

        </div>
    );
};

export default AboutPage;