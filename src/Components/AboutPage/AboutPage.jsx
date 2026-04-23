import React, { useState } from 'react';
import './AboutPage.css';
import { Link } from 'react-router';

const FEATURES = [
    {
        title: 'Dual decks with live waveforms',
        detail: 'Load any track onto Deck A or Deck B by dragging it from your playlist. Each deck renders a scrolling waveform in real time using WaveSurfer, so you can see exactly where you are in the track and anticipate drops, breaks, and transitions.',
    },
    {
        title: '3-band EQ + crossfader',
        detail: 'Each deck has its own High, Mid, and Low EQ knobs wired directly into the Web Audio API signal chain. The crossfader uses a constant-power cosine curve so the volume stays consistent as you blend from one deck to the other.',
    },
    {
        title: 'Loop regions & cue points',
        detail: 'Hit IN to mark a loop start, then OUT to close it — MXR creates a region on the waveform and loops it seamlessly. You also get three hot-cue slots per deck to stamp timestamps and jump back to them instantly.',
    },
    {
        title: 'Auto BPM & ID3 tag import',
        detail: 'When you add a file, MXR reads its ID3 tags automatically — title, artist, album, and artwork — and runs a BPM analysis in the background. No manual entry needed; your track is ready to play in seconds.',
    },
    {
        title: 'Playlist management',
        detail: 'Organise your tracks into named playlists, search by title, artist or album, edit metadata inline, and rate tracks with a five-star system. Everything lives in your session — just drag a row onto a deck when you\'re ready to play it.',
    },
];

const AboutPage = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

    return (
        <div className="about-page">

            <div className="about-hero">
                <p className="about-sub">A browser-based DJ mixer for bedroom DJs and music enthusiasts.</p>
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