import React from 'react'
import PlaylistTable from "./PlaylistTable/PlaylistTable";
import './MixerPage.css'
import DJDecks from "./DJDecks/DJDecks";

const MixerPage = () => {
    return (
        <div>
            <DJDecks/>
            <PlaylistTable/>
        </div>
    );
}

export default MixerPage;