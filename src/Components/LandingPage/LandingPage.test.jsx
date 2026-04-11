/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react'
import {describe, it, expect} from 'vitest'
import LandingPageImage from "./LandingPageStuff/LandingPageImage/LandingPageImage";
import LandingPage from "./LandingPage";
import {MemoryRouter} from "react-router";

describe('LandingPage', () => {
    const renderPage = () => render(
        <MemoryRouter>
            <LandingPage/>
        </MemoryRouter>)

    it('renders main page image', () => {
        renderPage()
        const img = screen.getByRole('img', {name: 'DJ Mixing image'})
        expect(img).toBeInTheDocument()
    })

    it('renders main page text', () => {
        renderPage()
        const mainText = screen.getByRole('heading', {name: 'Music makes the people come together'})
        expect(mainText).toBeInTheDocument()
        const subText = screen.getByRole('heading', {name: 'Mix tracks together and create unique sounds with MXR, an app made for (bedroom) DJS that can be used by all music enthusiasts to bring their own ideas to life.'})
        expect(subText).toBeInTheDocument()
    })

    it('renders Mix online link', () => {
        renderPage()
        const mixLink = screen.getByRole('link', {name: 'Mix online with MXR'})
        expect(mixLink).toBeInTheDocument()
    })
})