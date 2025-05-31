import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwitchBtn from './SwitchBtn';

describe('SwitchBtn', () => {
    it('renders with label', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" />);
        expect(screen.getByText('Test Switch')).toBeInTheDocument();
    });

    it('renders checkbox with correct checked state', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={true} label="Test Switch" />);
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('renders checkbox as unchecked when value is false', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" />);
        expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('calls onChange when clicked', async () => {
        const user = userEvent.setup();
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" />);
        
        await user.click(screen.getByRole('checkbox'));
        expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('renders as disabled when disabled prop is true', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" disabled={true} />);
        expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('renders as enabled when disabled prop is false', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" disabled={false} />);
        expect(screen.getByRole('checkbox')).toBeEnabled();
    });

    it('renders as enabled when disabled prop is not provided', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" />);
        expect(screen.getByRole('checkbox')).toBeEnabled();
    });

    it('does not call onChange when disabled and clicked', async () => {
        const user = userEvent.setup();
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" disabled={true} />);
        
        await user.click(screen.getByRole('checkbox'));
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('has correct structure with slider element', () => {
        const mockOnChange = jest.fn();
        render(<SwitchBtn onChange={mockOnChange} value={false} label="Test Switch" />);
        
        expect(document.querySelector('.switch-btn')).toBeInTheDocument();
        expect(document.querySelector('.switch')).toBeInTheDocument();
        expect(document.querySelector('.slider')).toBeInTheDocument();
    });
});