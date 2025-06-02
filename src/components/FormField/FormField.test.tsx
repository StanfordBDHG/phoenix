import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../helpers/i18n';
import FormField from './FormField';

// Mock the help icon since it's imported as an SVG
jest.mock('../../images/icons/help-circle-outline.svg', () => 'help-icon-mock');

const renderWithI18n = (component: React.ReactElement) => {
    return render(
        <I18nextProvider i18n={i18n}>
            {component}
        </I18nextProvider>
    );
};

describe('FormField', () => {
    it('renders without label when none provided', () => {
        renderWithI18n(<FormField />);
        const formField = document.querySelector('.form-field');
        expect(formField).toBeInTheDocument();
        expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });

    it('renders with label', () => {
        renderWithI18n(<FormField label="Test Label" />);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('renders with sublabel', () => {
        renderWithI18n(<FormField label="Test Label" sublabel="Test sublabel" />);
        expect(screen.getByText('Test sublabel')).toBeInTheDocument();
        expect(screen.getByText('Test sublabel')).toHaveClass('form-field__sublabel');
    });

    it('renders children content', () => {
        renderWithI18n(
            <FormField label="Test Label">
                <input type="text" placeholder="Test input" />
            </FormField>
        );
        expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    });

    it('shows optional indicator when isOptional is true', () => {
        renderWithI18n(<FormField label="Test Label" isOptional={true} />);
        expect(screen.getByText(/optional/i)).toBeInTheDocument();
        expect(screen.getByText(/optional/i)).toHaveClass('form-field__optional');
    });

    it('does not show optional indicator when isOptional is false', () => {
        renderWithI18n(<FormField label="Test Label" isOptional={false} />);
        expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
    });

    it('renders tooltip icon when tooltip is provided', () => {
        renderWithI18n(<FormField label="Test Label" tooltip="Test tooltip" />);
        const helpIcon = screen.getByAltText('Help');
        expect(helpIcon).toBeInTheDocument();
        expect(helpIcon).toHaveClass('form-field__help-icon');
    });

    it('does not render tooltip icon when tooltip is not provided', () => {
        renderWithI18n(<FormField label="Test Label" />);
        expect(screen.queryByAltText('Help')).not.toBeInTheDocument();
    });

    it('shows tooltip on mouse enter and hides on mouse leave', async () => {
        const user = userEvent.setup();
        renderWithI18n(<FormField label="Test Label" tooltip="Test tooltip content" />);
        
        const helpIcon = screen.getByAltText('Help');
        
        // Tooltip should not be visible initially
        expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
        
        // Show tooltip on mouse enter
        await act(async () => {
            await user.hover(helpIcon);
        });
        expect(screen.getByText('Test tooltip content')).toBeInTheDocument();
        expect(screen.getByText('Test tooltip content')).toHaveClass('form-field__tooltip');
        
        // Hide tooltip on mouse leave
        await act(async () => {
            await user.unhover(helpIcon);
        });
        expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
    });

    it('toggles tooltip on click', async () => {
        const user = userEvent.setup();
        renderWithI18n(<FormField label="Test Label" tooltip="Test tooltip content" />);
        
        const helpIcon = screen.getByAltText('Help');
        
        // Tooltip should not be visible initially
        expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
        
        // Show tooltip on click
        await act(async () => {
            await user.click(helpIcon);
        });
        expect(screen.getByText('Test tooltip content')).toBeInTheDocument();
        
        // Hide tooltip on second click
        await act(async () => {
            await user.click(helpIcon);
        });
        expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument();
    });

    it('renders tooltip arrow when tooltip is shown', async () => {
        const user = userEvent.setup();
        renderWithI18n(<FormField label="Test Label" tooltip="Test tooltip content" />);
        
        const helpIcon = screen.getByAltText('Help');
        await act(async () => {
            await user.click(helpIcon);
        });
        
        const tooltipArrow = document.querySelector('.form-field__tooltip-arrow');
        expect(tooltipArrow).toBeInTheDocument();
    });

    it('renders all props together', async () => {
        const user = userEvent.setup();
        renderWithI18n(
            <FormField 
                label="Test Label" 
                sublabel="Test sublabel"
                tooltip="Test tooltip"
                isOptional={true}
            >
                <input type="text" placeholder="Test input" />
            </FormField>
        );
        
        expect(screen.getByText('Test Label')).toBeInTheDocument();
        expect(screen.getByText('Test sublabel')).toBeInTheDocument();
        expect(screen.getByText(/optional/i)).toBeInTheDocument();
        expect(screen.getByAltText('Help')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
        
        // Show tooltip
        await act(async () => {
            await user.click(screen.getByAltText('Help'));
        });
        expect(screen.getByText('Test tooltip')).toBeInTheDocument();
    });
});