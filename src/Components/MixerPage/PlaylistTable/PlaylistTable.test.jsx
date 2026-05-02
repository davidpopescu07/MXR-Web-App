/** @vitest-environment jsdom */
import {screen, render, fireEvent, waitFor, within} from '@testing-library/react'
import {describe, it, expect, vi, beforeAll} from 'vitest'
import PlaylistTable from "./PlaylistTable";
import userEvent from '@testing-library/user-event'
import { parseBlob } from 'music-metadata-browser'
import { analyze } from 'web-audio-beat-detector'
import Cookies from "js-cookie";

//
vi.mock('music-metadata-browser', () => ({
    parseBlob: vi.fn(),
}))

vi.mock('web-audio-beat-detector', () => ({
    analyze: vi.fn(),
}))

beforeAll(() => {
    const mockAudioBuffer = {
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 2,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
    }

    window.AudioContext = vi.fn().mockImplementation(() => ({
        decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
    }))

    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url")
})

beforeEach(() => {
    Cookies.remove('mxr-playlists')
    Cookies.remove('mxr-current-playlist')
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
        const albumInput = screen.getByDisplayValue('Selected Ambient Works 85-92')
        await user.clear(albumInput)
        await user.type(albumInput, 'ALBUMTEST')
        const artistInput = screen.getByDisplayValue('Aphex Twin')
        await user.clear(artistInput)
        await user.type(artistInput, 'AFX')
        const saveButton = screen.getByRole('button', {name: /save/i})
        await user.click(saveButton)
        expect(screen.getByText('WTHELLY')).toBeInTheDocument()
        expect(screen.queryByText('Xtal')).not.toBeInTheDocument()
        expect(screen.getByText('ALBUMTEST')).toBeInTheDocument()
        expect(screen.queryByText('Selected Ambient Works 85-92')).not.toBeInTheDocument()
        expect(screen.getByText('AFX')).toBeInTheDocument()
        expect(screen.queryByText('Aphex Twin')).not.toBeInTheDocument()
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

    it('creates a new playlist and switches to it', async() => {
        const { user } = setup()
        await user.click(screen.getByText('▼', { exact: false }))
        await user.click(screen.getByText('+ New playlist'))
        await user.type(screen.getByPlaceholderText('Playlist name...'), 'MyNewPlaylist')
        await user.keyboard('{Enter}')

        expect(screen.getByText('MyNewPlaylist')).toBeInTheDocument()
        expect(screen.getByText(/0 Tracks/)).toBeInTheDocument()
    })

    it('adds a new track and navigates to the second page to see it', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: "NEWSONG", artist: "ME" },
            format: { duration: 200 }
        })

        const file = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' })
        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, file)

        await waitFor(() => {
            expect(screen.getByText(/6 Tracks/i)).toBeInTheDocument()
        })

        const page2Button = await screen.getByRole('button', { name: '2' })
        await user.click(page2Button)

        expect(screen.getByText('NEWSONG')).toBeInTheDocument()
    })

    it('sets dataTransfer on drag start', () => {
        setup()
        const firstRow = screen.getAllByRole('row')[1]
        const dataTransfer = { setData: vi.fn(), effectAllowed: '' }

        fireEvent.dragStart(firstRow, { dataTransfer })

        expect(dataTransfer.setData).toHaveBeenCalledWith(
            "application/json",
            expect.stringContaining('Xtal')
        )
    })

    it('closes the playlist dropdown when clicking outside', async () => {
        const { user } = setup()
        const dropdownBtn = screen.getByText('▼', { exact: false })
        await user.click(dropdownBtn)
        expect(screen.getByText('+ New playlist')).toBeInTheDocument()

        const container = document.querySelector('.playlist-page')
        await user.click(container)

        expect(screen.queryByText('+ New playlist')).not.toBeInTheDocument()
    })

    it('prevents creating a playlist with an existing name', async () => {
        const { user } = setup()
        await user.click(screen.getByText('▼', { exact: false }))
        await user.click(screen.getByText('+ New playlist'))

        const input = screen.getByPlaceholderText('Playlist name...')
        await user.type(input, 'CoolPlaylist{Enter}')

        expect(screen.getByText(/5 Tracks/)).toBeInTheDocument()
    })

    it('truncates very long track titles', async () => {
        const { user } = setup()
        const editButtons = screen.getAllByRole('button', { name: 'Edit' })
        await user.click(editButtons[0])

        const titleInput = screen.getByDisplayValue('Xtal')
        await user.clear(titleInput)
        await user.type(titleInput, 'This Is A Very Very Very Very Very Long Title')
        await user.click(screen.getByRole('button', { name: 'Save' }))

        expect(screen.getByText(/This Is A Very Very../)).toBeInTheDocument()
    })

    it('displays "-" for BPM if the analyzer fails', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: "FAILSONG", artist: "ME", album: "ALB", picture: [] },
            format: { duration: 200 }
        })
        vi.mocked(analyze).mockRejectedValueOnce(new Error("BPM Error"))

        const fakeFile = new File(['audio'], 'fail.mp3', { type: 'audio/mpeg' })
        fakeFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))

        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, fakeFile)

        const page2Button = await screen.getByRole('button', { name: '2' })
        await user.click(page2Button)

        await waitFor(() => {
            expect(screen.getByText('FAILSONG')).toBeInTheDocument()
        })

        expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('uses filename as title when metadata has no title', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: undefined, artist: "ME", album: "ALB", picture: [] },
            format: { duration: 200 }
        })
        vi.mocked(analyze).mockResolvedValue(128)

        const fakeFile = new File(['audio'], 'my-cool-track.mp3', { type: 'audio/mpeg' })
        fakeFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))

        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, fakeFile)
        const page2Button = await screen.getByRole('button', { name: '2' })
        await user.click(page2Button)
        await waitFor(() => {
            expect(screen.getByText('my-cool-track.mp3')).toBeInTheDocument()
        })
    })

    it('shows "--:--" when track has no duration in metadata', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: "NODURATION", artist: "ME", album: "ALB", picture: [] },
            format: {}
        })
        vi.mocked(analyze).mockResolvedValue(128)

        const fakeFile = new File(['audio'], 'nodur.mp3', { type: 'audio/mpeg' })
        fakeFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))

        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, fakeFile)

        const page2Button = await screen.getByRole('button', { name: '2' })
        await user.click(page2Button)
        await waitFor(() => {
            expect(screen.getByText('NODURATION')).toBeInTheDocument()
        })

        expect(screen.getByText('--:--')).toBeInTheDocument()
    })

    it('renders artwork image when track has picture metadata', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: {
                title: "ARTSONG",
                artist: "ME",
                album: "ALB",
                picture: [{ data: new Uint8Array([1, 2, 3]), format: 'image/jpeg' }]
            },
            format: { duration: 180 }
        })
        vi.mocked(analyze).mockResolvedValue(128)

        const fakeFile = new File(['audio'], 'art.mp3', { type: 'audio/mpeg' })
        fakeFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))

        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, fakeFile)
        const page2Button = await screen.getByRole('button', { name: '2' })
        await user.click(page2Button)
        await waitFor(() => {
            expect(screen.getByText('ARTSONG')).toBeInTheDocument()
        })

        const artworkImg = document.querySelector('.track-artwork')
        expect(artworkImg).toBeInTheDocument()
        expect(artworkImg.tagName).toBe('IMG')
    })

    it('prev button is disabled on the first page', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: "PAGESONG", artist: "ME", album: "ALB", picture: [] },
            format: { duration: 180 }
        })
        vi.mocked(analyze).mockResolvedValue(128)

        const fakeFile = new File(['audio'], 'art.mp3', { type: 'audio/mpeg' })
        fakeFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))

        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, fakeFile)

        expect(screen.getByRole('button', { name: '‹' })).toBeDisabled()
    })

    it('next button is disabled on the last page', async () => {
        const { user } = setup()

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: "PAGESONG", artist: "ME", album: "ALB", picture: [] },
            format: { duration: 180 }
        })
        vi.mocked(analyze).mockResolvedValue(128)

        const fakeFile = new File(['audio'], 'art.mp3', { type: 'audio/mpeg' })
        fakeFile.arrayBuffer = () => Promise.resolve(new ArrayBuffer(8))

        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, fakeFile)

        const page2Button = await screen.getByRole('button', { name: '2' })
        await user.click(page2Button)

        expect(screen.getByRole('button', { name: '›' })).toBeDisabled()
    })

    it('changes star classes on hover', async () => {
        setup()
        const starContainers = document.querySelectorAll('.star-rating')
        const stars = within(starContainers[0]).getAllByText('★')

        fireEvent.mouseEnter(stars[2])

        expect(stars[0].className).toContain('active')
        expect(stars[1].className).toContain('active')
        expect(stars[2].className).toContain('active')

        fireEvent.mouseLeave(stars[2])
        expect(stars[2].className).toContain('active')
    })


    it('resets to page 1 when search term changes while keeping pagination visible', async () => {
        const { user } = setup()

        const file = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' })
        const fileInput = document.querySelector('input[type="file"]')
        await user.upload(fileInput, file)

        const page2Button = await screen.findByRole('button', { name: '2' })
        await user.click(page2Button)

        const searchBox = screen.getByPlaceholderText('search for tracks...')
        await user.type(searchBox, 'e')

        const page1Button = screen.getByRole('button', { name: '1' })
        expect(page1Button.className).toContain('active')
    })

    it('renders pagination ellipses for large playlists', async () => {
        const { user } = setup();

        vi.mocked(parseBlob).mockResolvedValue({
            common: { title: "Track" }, format: { duration: 10 }
        });

        const fileInput = document.querySelector('input[type="file"]');
        const file = new File(['audio'], 't.mp3', { type: 'audio/mpeg' });

        for(let i=0; i<50; i++) {
            await user.upload(fileInput, file);
        }

        expect(screen.getByText('…')).toBeInTheDocument();
    });
})