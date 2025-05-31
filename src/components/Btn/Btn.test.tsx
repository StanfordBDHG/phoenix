import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Btn from './Btn';

describe('Btn', () => {
    it('renders with title', () => {
        render(<Btn title="Click me" />);
        expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('calls onClick when clicked', async () => {
        const user = userEvent.setup();
        const mockOnClick = jest.fn();
        render(<Btn title="Click me" onClick={mockOnClick} />);
        
        await user.click(screen.getByRole('button'));
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('renders with correct type attribute', () => {
        render(<Btn title="Submit" type="submit" />);
        expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('defaults to button type when not specified', () => {
        render(<Btn title="Default" />);
        expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('renders with custom id', () => {
        render(<Btn title="Test" id="custom-id" />);
        expect(screen.getByRole('button')).toHaveAttribute('id', 'custom-id');
    });

    it('renders with icon', () => {
        render(<Btn title="Add" icon="ion-plus-round" />);
        const button = screen.getByRole('button');
        const icon = button.querySelector('i.ion-plus-round');
        expect(icon).toBeInTheDocument();
    });

    it('applies primary variant class', () => {
        render(<Btn title="Primary" variant="primary" />);
        expect(screen.getByRole('button')).toHaveClass('regular-btn', 'primary');
    });

    it('applies secondary variant class', () => {
        render(<Btn title="Secondary" variant="secondary" />);
        expect(screen.getByRole('button')).toHaveClass('regular-btn', 'secondary');
    });

    it('renders without variant class when not specified', () => {
        render(<Btn title="Default" />);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('regular-btn');
        expect(button).not.toHaveClass('primary');
        expect(button).not.toHaveClass('secondary');
    });

    it('renders icon and title together', () => {
        render(<Btn title="Delete" icon="ion-ios-trash" />);
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Delete');
        expect(button.querySelector('i.ion-ios-trash')).toBeInTheDocument();
    });

    it('does not call onClick when no handler provided', async () => {
        const user = userEvent.setup();
        render(<Btn title="No handler" />);
        
        // Should not throw error when clicked
        await user.click(screen.getByRole('button'));
        expect(screen.getByRole('button')).toBeInTheDocument();
    });
});