
/** @vitest-environment jsdom */
import { render, screen} from '@testing-library/react'
import {describe, it, expect} from 'vitest'
import Login from './Login'
import {MemoryRouter} from "react-router";
import Navbar from "../../LandingPage/Navbar/Navbar";

describe('Login', () => {

    const renderLogin = () =>
        render(<Login/>)

    it('renders the text', () => {
        renderLogin()
        const mainText = screen.getByRole('heading', {name: 'Log into your account'})
        expect(mainText).toBeInTheDocument()
        const subText = screen.getByRole('heading', {name: 'Don\'t have an account? Sign up'})
        expect(subText).toBeInTheDocument()
    })

    it('renders the input fields', () => {
        renderLogin()
        const emailInput = screen.getByRole('textbox', {name: 'Email'})
        expect(emailInput).toBeInTheDocument()
        const passwordInput = screen.getByLabelText('Password')
        expect(passwordInput).toBeInTheDocument()
    })

    it('renders the login button', () => {
        renderLogin()
        const loginButton = screen.getByRole('button', {name: 'Log in'})
        expect(loginButton).toBeInTheDocument()
    })
})