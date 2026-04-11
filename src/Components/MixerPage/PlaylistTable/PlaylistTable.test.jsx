/** @vitest-environment jsdom */
import {screen, render, fireEvent, waitFor, within} from '@testing-library/react'
import {describe, it, expect} from 'vitest'
import PlaylistTable from "./PlaylistTable";
import userEvent from '@testing-library/user-event'


//

beforeAll(() => {
    // Web Audio API isn't available in jsdom
    window.AudioContext = vi.fn().mockImplementation(() => ({
        decodeAudioData: vi.fn().mockResolvedValue({}),
    }))

    // URL.createObjectURL is used when loading audio files
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url")
})

// helper for simulating real user input
const setup = () => {
    const user = userEvent.setup()
    render(<PlaylistTable/>)
    return {user}
}

const getAllRows = () => screen.getAllByRole('row').slice(1) // slice off table head row

// tests here
describe('PlaylistTable', () => {

    // rendering
    it('renders the default playlist name in the dropdown button', () => {
        setup();
        expect(screen.getByText('CoolPlaylist')).toBeInTheDocument();
    })

    it('renders all initial 5 tracks', () => {
        setup()
        const rows = getAllRows()
        expect(rows).toHaveLength(5)
    })

    it('shows the correct track title in a row', () => {
        setup()
        expect(screen.getByText('Xtal')).toBeInTheDocument()
    })

    it('shows correct track count in the botton row', () => {
        setup()
        expect(screen.getByText('5 Tracks', {exact : false})).toBeInTheDocument()
    })

    it('placeholder text for search renders', () => {
        setup()
        expect(screen.queryByPlaceholderText('search for tracks...')).toBeInTheDocument()
    })

    it('add track button renders', () => {
        setup()
        expect(screen.getByRole('button', {name: '+ Add Track'})).toBeInTheDocument()
    })

    // enough rendering...

    // search!

    it('properly filter tracks by title when searching', async() => {
        const {user} = setup()
        const searchBox = screen.getByPlaceholderText('search for tracks...')
        await user.type(searchBox, 'Xtal')
        expect(await screen.getByText('Xtal')).toBeInTheDocument()
        expect(screen.queryByText('Conceited')).not.toBeInTheDocument()
    })

    it('properly filter tracks by artist name when searching', async() => {
        const {user} = setup()
        const searchBox = screen.getByPlaceholderText('search for tracks...')
        await user.type(searchBox, 'remy ma')
        expect(await screen.getByText('Conceited')).toBeInTheDocument()
        expect(screen.queryByText('Xtal')).not.toBeInTheDocument()
    })

    it('properly filter tracks by album name when searching', async() => {
        const {user} = setup()
        const searchBox = screen.getByPlaceholderText('search for tracks...')
        await user.type(searchBox, 'post')
        expect(await screen.getByText('Army of me')).toBeInTheDocument()
        expect(screen.queryByText('Xtal')).not.toBeInTheDocument()
    })

    it('show no tracks when search term matches nothing', async() => {
        const {user} = setup()
        const searchBox = screen.getByPlaceholderText('search for tracks...')
        await user.type(searchBox, 'wthelly')
        const rows = screen.getAllByRole('row').slice(1)
        expect(rows).toHaveLength(0)
    })

    // Edit & Save function

    it('shows input fields when edit button is clicked', async() => {
        const {user} = setup()
        const editButtons = screen.getAllByRole('button', {name: 'Edit'})
        await user.click(editButtons[0])
        expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
    })

    it('input fields remain modified after save is clicked', async() => {
        const {user} = setup()
        const editButtons = screen.getAllByRole('button', {name: 'Edit'})
        await user.click(editButtons[0])
        const titleInput = screen.getByDisplayValue('Xtal')
        await user.clear(titleInput)
        await user.type(titleInput, 'WTHELLY')
        const saveButton = screen.getByRole('button', {name: /save/i})
        await user.click(saveButton)
        expect(screen.getByText('WTHELLY')).toBeInTheDocument()
        expect(screen.queryByText('Xtal')).not.toBeInTheDocument()
    })

    // test Deleting

    it('track gets removed from the playlist after delete is clicked', async() => {
        const {user} = setup()
        const deleteButtons = screen.getAllByRole('button', {name: 'Remove'})
        await user.click(deleteButtons[0]) // this will delete the 'Xtal' preview track
        expect(screen.queryByText('Xtal')).not.toBeInTheDocument()
    })

    it('track count in the footer gets updated after removal', async() => {
        const {user} = setup()
        const deleteButtons = screen.getAllByRole('button', {name: 'Remove'})
        await user.click(deleteButtons[0])
        expect(screen.getByText(/4 Tracks/)).toBeInTheDocument()
    })

    // star rating

    it('updates star rating after a star is clicked', async() => {
        const {user} = setup()
        const starContainers = document.querySelectorAll('.star-rating')
        const firstTrackStars = within(starContainers[0]).getAllByText('★')

        // user clicks the 4th star (index = 3)
        await user.click(firstTrackStars[3])
        // after clicking the 4th star, the first 4 stars should have class "active"

        const updatedStars = within(starContainers[0]).getAllByText('★')
        expect(updatedStars[0].className).toContain('active')
        expect(updatedStars[1].className).toContain('active')
        expect(updatedStars[2].className).toContain('active')
        expect(updatedStars[3].className).toContain('active')
        expect(updatedStars[4].className).toContain('inactive')
    })

    // open playlist management dropdown menu

    it('opens the playlist dropdown menu when the button is clicked', async() => {
        const {user} = setup()
        const dropdownMenuButton = screen.getByText('▼', {exact: false})
        await user.click(dropdownMenuButton)
        expect(screen.getByText('+ New playlist')).toBeInTheDocument()
    })

    it('playlist name input renders after clicking "+ New playlist"', async() => {
        const {user} = setup()
        const dropdownMenuButton = screen.getByText('▼', {exact: false})
        await user.click(dropdownMenuButton)
        const newPlaylist = screen.getByText('+ New playlist')
        await user.click(newPlaylist)
        expect(screen.getByPlaceholderText('Playlist name...')).toBeInTheDocument()

    })

})