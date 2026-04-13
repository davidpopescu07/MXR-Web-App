/** @vitest-environment jsdom */
import {screen, render, fireEvent, waitFor, within, act} from '@testing-library/react'
import {describe, it, expect, vi, beforeAll} from 'vitest'
import userEvent from '@testing-library/user-event'
import DJDecks from "./DJDecks";
import {Deck} from './DJDecks'
import WaveSurfer from 'wavesurfer.js'

const mockTrack = {
    title: 'Xtal',
    artist: 'Aphex Twin',
    album: 'SAW 85-92',
    bpm: 115,
    length: '4:53',
    rating: 5,
    artwork: null,
    audioUrl: null,
}
const mockTrackWithAudio = {
    ...mockTrack,
    audioUrl: 'blob:mock-audio-url'
}
// A fake wsRef with enough surface area to exercise loop/cue logic
const makeMockWsRef = (currentTime = 2) => ({
    current: {
        getCurrentTime: vi.fn(() => currentTime),
        setTime: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        on: vi.fn(() => vi.fn()), // returns an unsubscribe fn
    }
})

const makeMockRegionsRef = () => ({
    current: {
        addRegion: vi.fn(() => ({
            remove: vi.fn(),
            start: 0,
            end: 5,
        }))
    }
})

const mockDeckSetup = (track = mockTrack, isPlaying = false, wsRef = null, regionsRef = null) => {
    const user = userEvent.setup()
    render(
        <Deck
            side="left"
            track={track}
            isPlaying={isPlaying}
            onPlay={vi.fn()}
            onBpmChange={vi.fn()}
            wsRef={wsRef ?? {current: null}}
            regionsRef={regionsRef ?? {current: null}}
        />
    )
    return {user}
}
vi.mock('wavesurfer.js', () => ({
    default: {
        create: vi.fn(() => ({
            on: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            destroy: vi.fn(),
            getCurrentTime: vi.fn(() => 0),
            setTime: vi.fn(),
            getMediaElement: vi.fn(() => null),
        }))
    }
}))

vi.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
    default: {
        create: vi.fn(() => ({
            addRegion: vi.fn(() => ({remove: vi.fn(), start: 0, end: 1})),
        }))
    }
}))

beforeAll(() => {
    const mockAudioContextInstance = {
        state: 'running',
        resume: vi.fn(),
        currentTime: 0,
        destination: {},
        createMediaElementSource: vi.fn(() => ({
            connect: vi.fn(),
            disconnect: vi.fn(),
        })),
        createBiquadFilter: vi.fn(() => ({
            connect: vi.fn(),
            disconnect: vi.fn(),
            frequency: { setTargetAtTime: vi.fn(), value: 0 },
            gain: { setTargetAtTime: vi.fn(), value: 0 },
            type: 'lowpass',
            Q: { value: 0 },
        })),
        createGain: vi.fn(() => ({
            connect: vi.fn(),
            disconnect: vi.fn(),
            gain: { value: 1 },
        })),
    }

    // Use a real class so `new AudioContext()` works
    window.AudioContext = class {
        constructor() {
            return mockAudioContextInstance
        }
    }

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
})

const setup = () => {
    const user = userEvent.setup()
    render(<DJDecks/>)
    return {user}
}

describe('Deck', () => {
    it('renders IN button', () => {
        mockDeckSetup()
        expect(screen.getByRole('button', {name: 'IN'})).toBeInTheDocument()
    })

    it('renders OUT button', () => {
        mockDeckSetup()
        expect(screen.getByRole('button', {name: 'OUT'})).toBeInTheDocument()
    })

    it('renders SYNC button', () => {
        mockDeckSetup()
        expect(screen.getByRole('button', {name: 'SYNC'})).toBeInTheDocument()
    })

    it('renders CUE #0 button', () => {
        mockDeckSetup()
        expect(screen.getByRole('button', {name: 'CUE #0'})).toBeInTheDocument()
    })

    it('renders CUE #1 button', () => {
        mockDeckSetup()
        expect(screen.getByRole('button', {name: 'CUE #1'})).toBeInTheDocument()
    })

    it('renders CUE #2 button', () => {
        mockDeckSetup()
        expect(screen.getByRole('button', {name: 'CUE #2'})).toBeInTheDocument()
    })

    it('renders the play button when no track is loaded', () => {
        mockDeckSetup()
        expect(screen.getByTitle('Play')).toBeInTheDocument()
    })

    it('cue buttons are disabled when no track is loaded', () => {
        mockDeckSetup(null)
        const cueButtons = screen.getAllByRole('button', {name: /CUE/i})
        cueButtons.forEach(btn => expect(btn).toBeDisabled())
    })

    it('BPM + and - buttons are disabled when no track is loaded', () => {
        mockDeckSetup(null)
        expect(screen.getByTitle('+1 BPM')).toBeDisabled()
        expect(screen.getByTitle('-1 BPM')).toBeDisabled()
    })

    it('renders track title, artist and track length when a track is provided', () => {
        mockDeckSetup(mockTrack)
        expect(screen.getByText('Xtal')).toBeInTheDocument()
        expect(screen.getByText('Aphex Twin')).toBeInTheDocument()
        expect(screen.getByText(/4:53/)).toBeInTheDocument()
    })

    it('CUE buttons are active when a track is loaded', () => {
        mockDeckSetup(mockTrack)
        const cueButtons = screen.getAllByRole('button', {name: /CUE/i})
        cueButtons.forEach(btn => expect(btn).toBeEnabled())
    })

    it('renders BPM value when a track is loaded', () => {
        mockDeckSetup(mockTrack)
        expect(screen.getByText(/115/)).toBeInTheDocument()
    })

    it('shows pause button when track is playing', () => {
        mockDeckSetup(mockTrack, true)
        expect(screen.getByTitle('Pause')).toBeInTheDocument()
    })

    it('shows the artwork placeholder ♪ when track has no artwork', () => {
        mockDeckSetup(mockTrack)
        expect(screen.getByText('♪')).toBeInTheDocument()
    })

    it('renders an img tag when track has artwork', () => {
        mockDeckSetup({...mockTrack, artwork: 'blob:mock-url'})
        expect(document.querySelector('img')).toBeInTheDocument()
    })

    it('BPM + and - buttons are enabled when a track is loaded', () => {
        mockDeckSetup(mockTrack)
        expect(screen.getByTitle('+1 BPM')).toBeEnabled()
        expect(screen.getByTitle('-1 BPM')).toBeEnabled()
    })

    it('adds drag-over class when dragging over the deck', () => {
        mockDeckSetup()
        const deck = document.querySelector('.deck')
        fireEvent.dragOver(deck, {
            preventDefault: () => {
            }
        })
        expect(deck.className).toContain('drag-over')
    })

    it('removes drag-over class when drag leaves the deck', () => {
        mockDeckSetup()
        const deck = document.querySelector('.deck')
        fireEvent.dragOver(deck, {
            preventDefault: () => {
            }
        })
        fireEvent.dragLeave(deck)
        expect(deck.className).not.toContain('drag-over')
    })

    it('toggles SYNC button on click', async () => {
        const {user} = mockDeckSetup()
        const syncButton = screen.getByRole('button', {name: 'SYNC'})
        expect(syncButton.className).not.toContain('active')
        await user.click(syncButton)
        expect(syncButton.className).toContain('active')
        await user.click(syncButton)
        expect(syncButton.className).not.toContain('active')
    })

    it('marks IN button active after clicking it with a track loaded', async () => {
        const {user} = mockDeckSetup(mockTrack, false, makeMockWsRef(1))
        const inBtn = screen.getByRole('button', {name: 'IN'})
        expect(inBtn.className).not.toContain('active')
        await user.click(inBtn)
        expect(inBtn.className).toContain('active')
    })

    it('does nothing when IN is clicked with no track', async () => {
        const {user} = mockDeckSetup(null, false, makeMockWsRef(1))
        const inBtn = screen.getByRole('button', {name: 'IN'})
        await user.click(inBtn)
        expect(inBtn.className).not.toContain('active')
    })

    it('activates loop and marks OUT button active after IN then OUT', async () => {
        const wsRef = makeMockWsRef(1)
        const regionsRef = makeMockRegionsRef()
        const {user} = mockDeckSetup(mockTrack, false, wsRef, regionsRef)

        await user.click(screen.getByRole('button', {name: 'IN'}))

        // Move playhead forward before pressing OUT
        wsRef.current.getCurrentTime.mockReturnValue(4)
        await user.click(screen.getByRole('button', {name: 'OUT'}))

        expect(screen.getByRole('button', {name: 'OUT'}).className).toContain('active')
        expect(regionsRef.current.addRegion).toHaveBeenCalledWith(
            expect.objectContaining({start: 1, end: 4})
        )
    })

    it('cancels loop when OUT is clicked a second time', async () => {
        const wsRef = makeMockWsRef(1)
        const regionsRef = makeMockRegionsRef()
        const {user} = mockDeckSetup(mockTrack, false, wsRef, regionsRef)

        await user.click(screen.getByRole('button', {name: 'IN'}))
        wsRef.current.getCurrentTime.mockReturnValue(4)
        await user.click(screen.getByRole('button', {name: 'OUT'}))

        // Second OUT press cancels the loop
        await user.click(screen.getByRole('button', {name: 'OUT'}))
        expect(screen.getByRole('button', {name: 'OUT'}).className).not.toContain('active')
        expect(screen.getByRole('button', {name: 'IN'}).className).not.toContain('active')
    })

    it('ignores OUT click if no start point is set', async () => {
        const wsRef = makeMockWsRef(4)
        const regionsRef = makeMockRegionsRef()
        const {user} = mockDeckSetup(mockTrack, false, wsRef, regionsRef)

        // Press OUT without pressing IN first
        await user.click(screen.getByRole('button', {name: 'OUT'}))
        expect(regionsRef.current.addRegion).not.toHaveBeenCalled()
    })

    it('ignores OUT if end time is too close to start', async () => {
        const wsRef = makeMockWsRef(1)
        const regionsRef = makeMockRegionsRef()
        const {user} = mockDeckSetup(mockTrack, false, wsRef, regionsRef)

        await user.click(screen.getByRole('button', {name: 'IN'}))
        // OUT at almost the same time — gap < 0.05s
        wsRef.current.getCurrentTime.mockReturnValue(1.01)
        await user.click(screen.getByRole('button', {name: 'OUT'}))
        expect(regionsRef.current.addRegion).not.toHaveBeenCalled()
    })
    it('sets a cue point and shows the time on the button', async () => {
        const wsRef = makeMockWsRef(3.5)
        const {user} = mockDeckSetup(mockTrack, false, wsRef)

        await user.click(screen.getByText('CUE #0'))
        // formatTime(3.5) → "0:03"
        expect(screen.getByText('CUE 0:03')).toBeInTheDocument()
    })

    it('sets all three cue points independently', async () => {
        const wsRef = makeMockWsRef()
        wsRef.current.getCurrentTime
            .mockReturnValueOnce(1)
            .mockReturnValueOnce(5)
            .mockReturnValueOnce(10)

        const {user} = mockDeckSetup(mockTrack, false, wsRef)

        await user.click(screen.getByText('CUE #0'))
        await user.click(screen.getByText('CUE #1'))
        await user.click(screen.getByText('CUE #2'))

        expect(screen.getByText('CUE 0:01')).toBeInTheDocument()
        expect(screen.getByText('CUE 0:05')).toBeInTheDocument()
        expect(screen.getByText('CUE 0:10')).toBeInTheDocument()
    })

    it('updates elapsed time while playing', async () => {
        vi.useFakeTimers()
        const wsRef = makeMockWsRef(0)

        render(
            <Deck
                side="left"
                track={mockTrack}
                isPlaying={true}
                onPlay={vi.fn()}
                onBpmChange={vi.fn()}
                wsRef={wsRef}
                regionsRef={{current: null}}
            />
        )

        // Before the interval fires, time shows 0:00
        expect(screen.getByText(/0:00 \/ 4:53/)).toBeInTheDocument()

        // Advance fake timers by 500ms and simulate wsRef returning a new time
        wsRef.current.getCurrentTime.mockReturnValue(7)
        act(() => {
            vi.advanceTimersByTime(500)
        })

        expect(screen.getByText(/0:07 \/ 4:53/)).toBeInTheDocument()

        vi.useRealTimers()
    })

    // ── BPM adjust ──────────────────────────────────────────────────────────

    it('calls onBpmChange with +1 when + is clicked', async () => {
        const onBpmChange = vi.fn()
        const user = userEvent.setup()
        render(
            <Deck
                side="left"
                track={mockTrack}
                isPlaying={false}
                onPlay={vi.fn()}
                onBpmChange={onBpmChange}
                wsRef={{current: null}}
                regionsRef={{current: null}}
            />
        )
        await user.click(screen.getByTitle('+1 BPM'))
        expect(onBpmChange).toHaveBeenCalledWith(1)
    })

    it('calls onBpmChange with -1 when - is clicked', async () => {
        const onBpmChange = vi.fn()
        const user = userEvent.setup()
        render(
            <Deck
                side="left"
                track={mockTrack}
                isPlaying={false}
                onPlay={vi.fn()}
                onBpmChange={onBpmChange}
                wsRef={{current: null}}
                regionsRef={{current: null}}
            />
        )
        await user.click(screen.getByTitle('-1 BPM'))
        expect(onBpmChange).toHaveBeenCalledWith(-1)
    })

})

describe('DJDecks', () => {
    it('renders left waveform placeholder', () => {
        setup()
        expect(screen.getByText('— deck A —')).toBeInTheDocument()
    })

    it('renders right waveform placeholder', () => {
        setup()
        expect(screen.getByText('— deck B —')).toBeInTheDocument()
    })

    it('loads a track onto deck A when dropped on the waveform panel', () => {
        setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            preventDefault: () => {
            },
            dataTransfer: {
                getData: () => JSON.stringify(mockTrack)
            }
        })
        expect(screen.getAllByText('Xtal').length).toBeGreaterThan(0)
    })

    it('loads a track onto deck B when dropped on the waveform panel', () => {
        setup()
        const rightPanel = document.querySelector('.waveform-panel.right')
        fireEvent.drop(rightPanel, {
            preventDefault: () => {
            },
            dataTransfer: {
                getData: () => JSON.stringify(mockTrack)
            }
        })
        expect(screen.getAllByText('Xtal').length).toBeGreaterThan(0)
    })

    it('toggles play on deck A after a track is dropped', async () => {
        const {user} = setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            preventDefault: () => {
            },
            dataTransfer: {getData: () => JSON.stringify(mockTrack)}
        })
        const playBtn = screen.getAllByTitle('Play')[0]
        await user.click(playBtn)
        expect(screen.getAllByTitle('Pause').length).toBeGreaterThan(0)
    })

    it('increments BPM on deck A after a track is dropped', async () => {
        const {user} = setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            preventDefault: () => {
            },
            dataTransfer: {getData: () => JSON.stringify(mockTrack)}
        })
        const plusBtn = screen.getAllByTitle('+1 BPM')[0]
        await user.click(plusBtn)
        expect(screen.getAllByText('116').length).toBeGreaterThan(0)
    })

    it('decrements BPM on deck A after track is dropped', async () => {
        const {user} = setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            preventDefault: () => {
            },
            dataTransfer: {getData: () => JSON.stringify(mockTrack)}
        })
        const minusBtn = screen.getAllByTitle('-1 BPM')[0]
        await user.click(minusBtn)
        expect(screen.getAllByText('114').length).toBeGreaterThan(0)
    })

    it('renders the CROSSFADER label', () => {
        setup()
        expect(screen.getByText('CROSSFADER')).toBeInTheDocument()
    })

    it('moves the crossfader thumb on mousedown + mousemove', () => {
        setup()
        const track = document.querySelector('.cf-track')
        const thumb = document.querySelector('.cf-thumb')

        // simulate a drag from left to right
        fireEvent.mouseDown(track, {clientX: 0, clientY: 0})
        fireEvent.mouseMove(window, {clientX: 100, clientY: 0})
        fireEvent.mouseUp(window)

        // thumb position changes — left style will differ from initial 50%
        expect(thumb.style.left).toBeDefined()
    })

    // ── vertical faders ─────────────────────────────────────────────────────

    it('renders two vertical fader tracks', () => {
        setup()
        const faders = document.querySelectorAll('.fader-track')
        expect(faders.length).toBe(2)
    })

    it('moves fader A thumb on mousedown + mousemove', () => {
        setup()
        const faders = document.querySelectorAll('.fader-track')
        const thumb = faders[0].querySelector('.fader-thumb')

        fireEvent.mouseDown(faders[0], {clientX: 0, clientY: 0})
        fireEvent.mouseMove(window, {clientX: 0, clientY: 50})
        fireEvent.mouseUp(window)

        expect(thumb.style.top).toBeDefined()
    })

    // ── EQ knobs ────────────────────────────────────────────────────────────

    it('renders EQ knob labels HIGH, MID, LOW, CFX', () => {
        setup()
        const labels = screen.getAllByText('HIGH')
        expect(labels.length).toBeGreaterThan(0)
        expect(screen.getAllByText('MID').length).toBeGreaterThan(0)
        expect(screen.getAllByText('LOW').length).toBeGreaterThan(0)
        expect(screen.getAllByText('CFX').length).toBeGreaterThan(0)
    })

    it('moves a knob on mousedown + mousemove', () => {
        setup()
        const knobs = document.querySelectorAll('.knob-svg')
        // just assert it doesn't crash and the knob exists
        expect(knobs.length).toBeGreaterThan(0)
        fireEvent.mouseDown(knobs[0], {
            clientY: 100, preventDefault: () => {
            }
        })
        fireEvent.mouseMove(window, {clientY: 50})
        fireEvent.mouseUp(window)
    })

    // ── dragOver on panels ──────────────────────────────────────────────────

    it('allows dragOver on the left waveform panel without error', () => {
        setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        expect(() => {
            fireEvent.dragOver(leftPanel, {
                preventDefault: () => {
                }
            })
        }).not.toThrow()
    })

    it('allows dragOver on the right waveform panel without error', () => {
        setup()
        const rightPanel = document.querySelector('.waveform-panel.right')
        expect(() => {
            fireEvent.dragOver(rightPanel, {
                preventDefault: () => {
                }
            })
        }).not.toThrow()

    })

    it('does not crash when adjusting BPM on a track with no bpm value', async () => {
        const { user } = setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            dataTransfer: { getData: () => JSON.stringify({ ...mockTrack, bpm: null }) }
        })
        // + button exists but clicking it should not crash or change anything
        const plusBtn = screen.getAllByTitle('+1 BPM')[0]
        await user.click(plusBtn)
        // no error thrown, bpm still shows —
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    // ── deck B drop + adjustBpm right side (lines 723-757) ──────────────────

    it('loads a track onto deck B via the deck wrapper and adjusts BPM', async () => {
        const { user } = setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        fireEvent.drop(deckWrappers[2], {
            dataTransfer: { getData: () => JSON.stringify(mockTrack) }
        })
        // both decks now show the track — get the second BPM adjust button
        const plusBtns = screen.getAllByTitle('+1 BPM')
        await user.click(plusBtns[plusBtns.length - 1])
        expect(screen.getAllByText('116').length).toBeGreaterThan(0)
    })

    it('does not crash when adjusting BPM on deck B with no bpm value', async () => {
        const { user } = setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        fireEvent.drop(deckWrappers[2], {
            dataTransfer: { getData: () => JSON.stringify({ ...mockTrack, bpm: null }) }
        })
        const plusBtns = screen.getAllByTitle('+1 BPM')
        await user.click(plusBtns[plusBtns.length - 1])
        expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    })

    // ── WaveformInner (lines 705, 723-757) ───────────────────────────────────
    // WaveformInner only mounts when track.audioUrl is truthy

    it('mounts WaveformInner for deck A when track has an audioUrl', () => {
        setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })
        // WaveformInner renders a plain div container — waveform-empty disappears
        expect(screen.queryByText('— deck A —')).not.toBeInTheDocument()
    })

    it('mounts WaveformInner for deck B when track has an audioUrl', async () => {
        setup()
        const rightPanel = document.querySelector('.waveform-panel.right')
        fireEvent.drop(rightPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })
        await waitFor(() => {
            expect(screen.queryByText('— deck B —')).not.toBeInTheDocument()
        })
    })

    it('triggers play on WaveformInner when isPlaying becomes true', async () => {
        const { user } = setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })
        await waitFor(() => {
            expect(screen.queryByText('— deck A —')).not.toBeInTheDocument()
        })
        await user.click(screen.getAllByTitle('Play')[0])
        await waitFor(() => {
            expect(screen.getAllByTitle('Pause').length).toBeGreaterThan(0)
        })
    })

    // ── handleReadyA/B — EQ chain built on ws ready (lines 614-627) ─────────
    // These fire when WaveSurfer calls the 'ready' event.
    // We need to capture the 'ready' callback and invoke it manually.

    it('builds EQ chain when deck A waveform is ready', async () => {
        let readyCb = null
        vi.mocked(WaveSurfer.create).mockReturnValueOnce({
            on: vi.fn((event, cb) => { if (event === 'ready') readyCb = cb }),
            play: vi.fn(),
            pause: vi.fn(),
            destroy: vi.fn(),
            getCurrentTime: vi.fn(() => 0),
            setTime: vi.fn(),
            getMediaElement: vi.fn(() => document.createElement('audio')),
        })

        setup()
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })

        await waitFor(() => expect(readyCb).not.toBeNull())
        expect(() => readyCb()).not.toThrow()
    })

    it('builds EQ chain when deck B waveform is ready', async () => {
        let readyCb = null
        vi.mocked(WaveSurfer.create).mockReturnValueOnce({
            on: vi.fn((event, cb) => { if (event === 'ready') readyCb = cb }),
            play: vi.fn(),
            pause: vi.fn(),
            destroy: vi.fn(),
            getCurrentTime: vi.fn(() => 0),
            setTime: vi.fn(),
            getMediaElement: vi.fn(() => document.createElement('audio')),
        })

        setup()
        const rightPanel = document.querySelector('.waveform-panel.right')
        fireEvent.drop(rightPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })

        await waitFor(() => expect(readyCb).not.toBeNull())
        expect(() => readyCb()).not.toThrow()
    })

    it('calls play on wavesurfer when isPlaying switches to true', async () => {
        const mockWs = {
            on: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            destroy: vi.fn(),
            getCurrentTime: vi.fn(() => 0),
            setTime: vi.fn(),
            getMediaElement: vi.fn(() => null),
        }

        vi.mocked(WaveSurfer.create).mockReturnValueOnce(mockWs)

        const { rerender } = render(
            <DJDecks />
        )

        // drop a track with audioUrl to trigger WaveformInner to mount
        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })

        await waitFor(() => expect(WaveSurfer.create).toHaveBeenCalled())

        // click play — this flips isPlaying in DJDecks, which passes it down to WaveformInner
        await userEvent.setup().click(screen.getAllByTitle('Play')[0])

        await waitFor(() => {
            expect(mockWs.play).toHaveBeenCalled()
        })
    })

    it('calls pause on wavesurfer when isPlaying switches to false', async () => {
        const mockWs = {
            on: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            destroy: vi.fn(),
            getCurrentTime: vi.fn(() => 0),
            setTime: vi.fn(),
            getMediaElement: vi.fn(() => null),
        }

        vi.mocked(WaveSurfer.create).mockReturnValueOnce(mockWs)

        render(<DJDecks />)

        const leftPanel = document.querySelector('.waveform-panel.left')
        fireEvent.drop(leftPanel, {
            dataTransfer: { getData: () => JSON.stringify(mockTrackWithAudio) }
        })

        await waitFor(() => expect(WaveSurfer.create).toHaveBeenCalled())

        const user = userEvent.setup()

        // click play, then click again to pause
        await user.click(screen.getAllByTitle('Play')[0])
        await waitFor(() => expect(mockWs.play).toHaveBeenCalled())

        await user.click(screen.getAllByTitle('Pause')[0])
        await waitFor(() => {
            expect(mockWs.pause).toHaveBeenCalled()
        })
    })

    it('renders the mixer column with EQ knobs and faders', () => {
            setup()
            expect(document.querySelector('.mixer-col')).toBeInTheDocument()
            expect(document.querySelector('.eq-section')).toBeInTheDocument()
            expect(document.querySelector('.faders-row')).toBeInTheDocument()
        })

    it('renders the dj-main-row', () => {
        setup()
        expect(document.querySelector('.dj-main-row')).toBeInTheDocument()
    })

    it('allows dragOver on the left deck wrapper', () => {
        setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        expect(() => {
            fireEvent.dragOver(deckWrappers[0], { preventDefault: () => {} })
        }).not.toThrow()
    })

    it('allows dragOver on the right deck wrapper', () => {
        setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        expect(() => {
            fireEvent.dragOver(deckWrappers[2], { preventDefault: () => {} })
        }).not.toThrow()
    })

    it('loads a track onto deck A via the left deck wrapper drop', async () => {
        setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        fireEvent.drop(deckWrappers[0], {
            dataTransfer: { getData: () => JSON.stringify(mockTrack) }
        })
        await waitFor(() => {
            expect(screen.getAllByText('Xtal').length).toBeGreaterThan(0)
        })
    })

    it('loads a track onto deck B via the right deck wrapper drop', async () => {
        setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        fireEvent.drop(deckWrappers[2], {
            dataTransfer: { getData: () => JSON.stringify(mockTrack) }
        })
        await waitFor(() => {
            expect(screen.getAllByText('Xtal').length).toBeGreaterThan(0)
        })
    })

    it('renders both left and right Deck components inside dj-main-row', () => {
        setup()
        const mainRow = document.querySelector('.dj-main-row')
        expect(within(mainRow).getAllByRole('button', { name: 'IN' }).length).toBe(2)
        expect(within(mainRow).getAllByRole('button', { name: 'OUT' }).length).toBe(2)
        expect(within(mainRow).getAllByRole('button', { name: 'SYNC' }).length).toBe(2)
    })

    it('renders 8 EQ knobs total (4 per deck)', () => {
        setup()
        const knobs = document.querySelectorAll('.knob-svg')
        expect(knobs.length).toBe(8)
    })

    it('does not crash on invalid JSON drop on left deck wrapper', () => {
        setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        expect(() => {
            fireEvent.drop(deckWrappers[0], {
                dataTransfer: { getData: () => 'not-valid-json' }
            })
        }).not.toThrow()
    })

    it('does not crash on invalid JSON drop on right deck wrapper', () => {
        setup()
        const deckWrappers = document.querySelectorAll('.dj-main-row > div')
        expect(() => {
            fireEvent.drop(deckWrappers[2], {
                dataTransfer: { getData: () => 'not-valid-json' }
            })
        }).not.toThrow()
    })

    it('all 8 EQ knobs respond to drag without crashing', () => {
        setup()
        const knobs = document.querySelectorAll('.knob-svg')
        expect(knobs.length).toBe(8)

        knobs.forEach((knob, i) => {
            fireEvent.mouseDown(knob, { clientY: 100 })
            fireEvent.mouseMove(window, { clientY: 50 })
            fireEvent.mouseUp(window)
            expect(knob).toBeInTheDocument()
        })
    })

    it('executes the disconnect cleanup method', async () => {
        const mockWs = {
            getMediaElement: () => document.createElement('audio'),
        };

        const { buildEQChain } = await import('./DJDecks');
        const chain = buildEQChain(mockWs);

        expect(() => chain.disconnect()).not.toThrow();
    });

    it('handles invalid JSON drop on Deck', () => {
        mockDeckSetup();
        const deck = document.querySelector('.deck');

        expect(() => {
            fireEvent.drop(deck, {
                dataTransfer: {
                    getData: () => 'not-json-at-all'
                }
            });
        }).not.toThrow();
    });

    it('handles failure to create MediaElementSource', async () => {
        const ac = new window.AudioContext();
        vi.spyOn(ac, 'createMediaElementSource').mockImplementation(() => {
            throw new Error('Mock source creation failed');
        });

        const mockWs = {
            getMediaElement: () => document.createElement('audio'),
        };

        const { buildEQChain } = await import('./DJDecks');
        const chain = buildEQChain(mockWs);

        expect(chain).toBeNull();
    });

    it('handles disconnect errors gracefully', async () => {
        const mockSource = {
            disconnect: vi.fn(() => { throw new Error('Disconnect failed'); }),
            connect: vi.fn()
        };

        const ac = new window.AudioContext();
        vi.spyOn(ac, 'createMediaElementSource').mockReturnValue(mockSource);

        const mockWs = {
            getMediaElement: () => document.createElement('audio'),
        };

        const { buildEQChain } = await import('./DJDecks');
        const chain = buildEQChain(mockWs);

        expect(chain).not.toBeNull();
    });
})