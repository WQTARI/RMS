import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusPill } from './StatusPill'
import '@testing-library/jest-dom'

describe('StatusPill', () => {
    it('renders correct text for PENDING status', () => {
        render(<StatusPill status="PENDING" />)
        expect(screen.getByText('PENDING')).toBeInTheDocument()
    })

    it('applies correct class for READY status', () => {
        render(<StatusPill status="READY" />)
        const pill = screen.getByText('READY')
        expect(pill).toHaveClass('bg-emerald-100')
    })
})
