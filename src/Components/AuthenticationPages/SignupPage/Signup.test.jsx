/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react'
import Signup from './Signup'
import {describe, it, expect} from 'vitest'
import { MemoryRouter } from "react-router";


describe('Signup', () => {
    const renderSignup = () =>
        render(
            <MemoryRouter>
                <Signup/>
            </MemoryRouter>
        )

    it('renders the text', () => {
        renderSignup()
        const mainText = screen.getByRole('heading', {name: 'Create account'})
        expect(mainText).toBeInTheDocument()
        const subText = screen.getByRole('heading', {name: 'Existing account? Log in'})
        expect(subText).toBeInTheDocument()
    })

    it('renders inputs', () => {
        renderSignup()
        const emailInput = screen.getByRole('textbox', {name: 'Email'})
        expect(emailInput).toBeInTheDocument()
        const confirmEmailInput = screen.getByRole('textbox', {name: 'Confirm Email'})
        expect(confirmEmailInput).toBeInTheDocument()
        const passwordInput = screen.getByLabelText('Password')
        expect(passwordInput).toBeInTheDocument()
    })

    it('render sign up button', () => {
        renderSignup()
        const signUpButton = screen.getByRole('button', {name: 'Sign up'})
        expect(signUpButton).toBeInTheDocument()
    })


})
