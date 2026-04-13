/** @vitest-environment jsdom */
import { screen, render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MixerPage from './MixerPage'

vi.mock('./DJDecks/DJDecks', () => ({
    default: () => <div data-testid="dj-decks">DJDecks</div>
}))

vi.mock('./PlaylistTable/PlaylistTable', () => ({
    default: () => <div data-testid="playlist-table">PlaylistTable</div>
}))

describe('MixerPage', () => {

    it('renders without crashing', () => {
        expect(() => render(<MixerPage />)).not.toThrow()
    })

    it('renders the DJDecks component', () => {
        render(<MixerPage />)
        expect(screen.getByTestId('dj-decks')).toBeInTheDocument()
    })

    it('renders the PlaylistTable component', () => {
        render(<MixerPage />)
        expect(screen.getByTestId('playlist-table')).toBeInTheDocument()
    })

    it('renders DJDecks before PlaylistTable in the DOM', () => {
        render(<MixerPage />)
        const decks = screen.getByTestId('dj-decks')
        const table = screen.getByTestId('playlist-table')
        expect(decks.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

})