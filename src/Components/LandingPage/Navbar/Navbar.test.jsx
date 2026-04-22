
/** @vitest-environment jsdom */
import { render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {describe, it, expect} from 'vitest'
import Navbar from './Navbar'

describe('Navbar', () =>    {
    const renderNavbar = () =>
        render(
            <MemoryRouter>
                <Navbar/>
            </MemoryRouter>
        )
    it ('renders the app name', () => {
        renderNavbar()
        // screen.getByText finds an element by its visible text
        // if it's not found then the test fails automatically
        const mainPageLink = screen.getByRole('link', {name: 'MXR'})
        expect(mainPageLink).toHaveAttribute('href', '/')
    })

    it('renders login and signup buttons', () => {
        renderNavbar()
        expect(screen.getByRole('link', {name: 'Login'})).toBeInTheDocument()
        expect(screen.getByRole('link', {name: 'Sign up'})).toBeInTheDocument()
    })

    it('renders all nav links', () => {
        renderNavbar()
        expect(screen.getByRole('link', {name: 'Mixer'})).toBeInTheDocument()
        expect(screen.getByRole('link', {name: 'About'})).toBeInTheDocument()
    })

    it('checks pointing of all nav links', () => {
        renderNavbar()
        const mixer = screen.getByRole('link', {name: 'Mixer'})
        expect(mixer).toHaveAttribute('href', '/mixer')
        const about = screen.getByRole('link', {name: 'About'})
        expect(about).toHaveAttribute('href', '/about')
    })

    it('login link points to /login', () => {
        renderNavbar()
        const loginLink = screen.getByRole('link', {name: 'Login'})
        expect(loginLink).toHaveAttribute('href', '/login')
        const registerLink = screen.getByRole('link', {name: 'Sign up'})
        expect(registerLink).toHaveAttribute('href', '/signup')
    })
})