import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { PromptInput } from './PromptInput';
import type { EnabledProvider } from './PromptInput';
import type { ChatState } from '../hooks/useChat';
import type { ActiveProvider } from '../hooks/useProvider';
import type { AppMode } from '../App';
import type { SerializedNode } from '../../plugin/types';

interface ChatProps {
  chat: ChatState;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  selection: SerializedNode[];
  provider: ActiveProvider;
  enabledProviders: EnabledProvider[];
  onProviderChange: (name: string) => void;
}

export function Chat({
  chat, mode, onModeChange, selection, provider,
  enabledProviders, onProviderChange,
}: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prefill, setPrefill] = useState('');

  // -- Selection toggle: Context vs Modify --
  const [modifyActive, setModifyActive] = useState(false);
  const prevModeRef = useRef<AppMode>(mode);

  const handleToggleModify = useCallback((toModify: boolean) => {
    if (toModify) {
      // Save current mode before switching
      prevModeRef.current = mode;
      setModifyActive(true);
      onModeChange('modify');
    } else {
      setModifyActive(false);
      onModeChange(prevModeRef.current);
    }
  }, [mode, onModeChange]);

  // When selection clears while modify toggle is active, restore previous mode
  useEffect(() => {
    if (selection.length === 0 && modifyActive) {
      setModifyActive(false);
      onModeChange(prevModeRef.current);
    }
  }, [selection.length, modifyActive, onModeChange]);

  // If user manually picks 'modify' from the dropdown, sync the toggle
  useEffect(() => {
    if (mode === 'modify' && selection.length > 0 && !modifyActive) {
      setModifyActive(true);
    }
    if (mode !== 'modify' && modifyActive) {
      setModifyActive(false);
    }
  }, [mode, selection.length, modifyActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages]);

  const placeholder = getPlaceholder(mode, selection.length);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {chat.messages.length === 0 && (
          <EmptyState mode={mode} onHintClick={setPrefill} />
        )}
        {chat.messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Selection context bar */}
      {selection.length > 0 && (
        <SelectionBar
          count={selection.length}
          modifyActive={modifyActive}
          onToggle={handleToggleModify}
        />
      )}

      {/* Input */}
      <PromptInput
        onSend={chat.sendMessage}
        onCancel={chat.cancelStream}
        isStreaming={chat.isStreaming}
        placeholder={placeholder}
        mode={mode}
        onModeChange={onModeChange}
        activeProvider={provider.name}
        activeModel={provider.options.model}
        enabledProviders={enabledProviders}
        onProviderChange={onProviderChange}
        tokenUsageInput={chat.tokenUsage.input}
        tokenUsageOutput={chat.tokenUsage.output}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill('')}
      />
    </div>
  );
}

function SelectionBar({
  count,
  modifyActive,
  onToggle,
}: {
  count: number;
  modifyActive: boolean;
  onToggle: (toModify: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-figma-border bg-figma-bg-secondary">
      <span className="text-xs text-figma-text-secondary">
        <span className="text-figma-text font-medium">{count}</span> selected
      </span>

      {/* Single toggle: Context <-> Modify */}
      <button
        type="button"
        onClick={() => onToggle(!modifyActive)}
        className="flex items-center gap-0 rounded-full bg-figma-bg-tertiary p-0.5 cursor-pointer"
      >
        <span
          className={`text-2xs px-2.5 py-0.5 rounded-full transition-colors ${
            !modifyActive
              ? 'bg-figma-bg text-figma-text font-medium'
              : 'text-figma-text-tertiary'
          }`}
        >
          Context
        </span>
        <span
          className={`text-2xs px-2.5 py-0.5 rounded-full transition-colors ${
            modifyActive
              ? 'bg-figma-bg text-figma-text font-medium'
              : 'text-figma-text-tertiary'
          }`}
        >
          Modify
        </span>
      </button>
    </div>
  );
}

interface Hint {
  title: string;
  prompt: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function EmptyState({ mode, onHintClick }: { mode: AppMode; onHintClick: (text: string) => void }) {
  const hints: Record<AppMode, Hint[]> = {
    generate: [
      { title: 'Login Form', prompt: 'Create a login form with email, password, and a blue submit button.' },
      { title: 'Pricing Table', prompt: 'Design a pricing card with three tiers: Basic, Pro, Enterprise.' },
      { title: 'Navigation Bar', prompt: 'Build a mobile navigation bar with Home, Search, Profile, and Settings icons.' },
      { title: 'Dashboard Header', prompt: 'Create a dashboard header with a search bar, notification bell, and user avatar.' },
      { title: 'Settings Page', prompt: 'Design a settings page with toggles for notifications, dark mode, and privacy.' },
      { title: 'Profile Card', prompt: 'Build a user profile card with avatar, name, bio, and a follow button.' },
      { title: 'Onboarding Flow', prompt: 'Create a three-step onboarding screen with progress dots and next/back buttons.' },
      { title: 'File Upload', prompt: 'Design a drag-and-drop file upload area with a progress bar and file list.' },
      { title: 'Chat Interface', prompt: 'Build a messaging UI with sent/received bubbles, a text input, and a send button.' },
      { title: 'Data Table', prompt: 'Create a data table with sortable columns, row selection checkboxes, and pagination.' },
      { title: 'Calendar Widget', prompt: 'Design a monthly calendar picker with selectable dates and navigation arrows.' },
      { title: 'Checkout Form', prompt: 'Build a checkout form with shipping address, payment method, and order summary.' },
      { title: 'Error State', prompt: 'Create a 404 error page with an illustration area, message, and a home button.' },
      { title: 'Feature Section', prompt: 'Design a three-column feature section with icons, headings, and descriptions.' },
      { title: 'Modal Dialog', prompt: 'Build a confirmation modal with a title, description, cancel, and confirm buttons.' },
      { title: 'Sidebar Menu', prompt: 'Create a collapsible sidebar with icon-and-label navigation items and a logout link.' },
      { title: 'Stats Dashboard', prompt: 'Design a row of four stat cards showing revenue, users, orders, and conversion rate.' },
      { title: 'Toast Notification', prompt: 'Build a set of toast notifications for success, warning, error, and info states.' },
      { title: 'Search Results', prompt: 'Create a search results page with filters on the left and result cards on the right.' },
      { title: 'Testimonial Card', prompt: 'Design a testimonial card with a quote, author photo, name, and company.' },
    ],
    modify: [
      { title: 'Dark Background', prompt: 'Make the background darker and increase the padding.' },
      { title: 'Heading Style', prompt: 'Change all headings to 24px bold.' },
      { title: 'Rounded Corners', prompt: 'Round the corners to 12px and add a subtle shadow.' },
      { title: 'Swap Colors', prompt: 'Invert the color scheme so backgrounds become dark and text becomes light.' },
      { title: 'Add Borders', prompt: 'Add a 1px gray border to all card elements.' },
      { title: 'Increase Spacing', prompt: 'Double the gap between all list items.' },
      { title: 'Font Swap', prompt: 'Switch all text to Inter and increase body text to 16px.' },
      { title: 'Button Resize', prompt: 'Make all buttons full-width with 48px height and 8px corner radius.' },
      { title: 'Muted Palette', prompt: 'Reduce the saturation of all colors by half for a muted look.' },
      { title: 'Tighten Layout', prompt: 'Reduce all padding and margins by 25% to make the layout more compact.' },
      { title: 'Add Icons', prompt: 'Add a relevant icon to the left of each navigation label.' },
      { title: 'Center Content', prompt: 'Center-align all text and horizontally center all elements.' },
      { title: 'Drop Shadows', prompt: 'Add a soft drop shadow to every card and button.' },
      { title: 'Opacity Layer', prompt: 'Add a semi-transparent dark overlay behind the modal content.' },
      { title: 'Highlight CTA', prompt: 'Make the primary call-to-action button larger and brighter than the rest.' },
      { title: 'Pill Buttons', prompt: 'Change all buttons from rounded rectangles to full pill shapes.' },
      { title: 'Reduce Clutter', prompt: 'Remove all decorative borders and simplify to flat backgrounds only.' },
      { title: 'Bold Headers', prompt: 'Make all section headings uppercase, semibold, and add a subtle underline.' },
      { title: 'Fix Alignment', prompt: 'Left-align all text elements and ensure consistent 16px left padding.' },
      { title: 'Warm Tones', prompt: 'Shift the color palette toward warm tones with amber accents.' },
    ],
    'style-transfer': [
      { title: 'Card Styling', prompt: "Apply this card's style to the other three cards." },
      { title: 'Button Styling', prompt: 'Copy the button styling to all buttons on this page.' },
      { title: 'Header Match', prompt: 'Match the styling of this header across all section headers.' },
      { title: 'Input Fields', prompt: 'Apply the selected input style to every text field in the form.' },
      { title: 'Badge Style', prompt: 'Transfer this badge appearance to all status indicators.' },
      { title: 'Icon Treatment', prompt: 'Apply the same icon color and size from this item to the rest of the list.' },
      { title: 'Typography Sync', prompt: 'Copy the font family, weight, and line-height from this text to all body copy.' },
      { title: 'Shadow Transfer', prompt: "Apply this element's shadow to all cards on the page." },
      { title: 'Border Style', prompt: 'Copy the border radius and border color from this card to the sidebar panels.' },
      { title: 'Nav Item Style', prompt: 'Transfer the active nav item styling to match the hover state of all nav items.' },
      { title: 'Color Scheme', prompt: 'Extract the color palette from this hero section and apply it to the footer.' },
      { title: 'Spacing System', prompt: 'Match the padding and gap values from this card layout to the grid below.' },
      { title: 'Link Styling', prompt: 'Apply the underline and color treatment of this link to all hyperlinks.' },
      { title: 'Avatar Style', prompt: 'Copy the border, size, and shadow from this avatar to all user thumbnails.' },
      { title: 'Divider Match', prompt: 'Transfer this divider style to all horizontal rules on the page.' },
      { title: 'Tag Styling', prompt: 'Apply this tag chip appearance to all category labels.' },
      { title: 'Table Header', prompt: 'Copy the table header styling to the secondary data table.' },
      { title: 'Tooltip Style', prompt: 'Transfer the tooltip appearance from this component to all other tooltips.' },
      { title: 'Progress Bar', prompt: 'Apply the gradient and height from this progress bar to the other two.' },
      { title: 'Form Layout', prompt: 'Match the label positioning and spacing from this field to the rest of the form.' },
    ],
    components: [
      { title: 'Button Set', prompt: 'Generate a button component set with Small, Medium, and Large sizes in Default, Hover, and Disabled states.' },
      { title: 'Input Field', prompt: 'Create an input field component with Label, Placeholder, Filled, Error, and Disabled variants.' },
      { title: 'Checkbox Group', prompt: 'Build a checkbox component with Unchecked, Checked, Indeterminate, and Disabled states.' },
      { title: 'Toggle Switch', prompt: 'Create a toggle switch component in On, Off, and Disabled variants for both light and dark themes.' },
      { title: 'Avatar Set', prompt: 'Generate an avatar component with XS, SM, MD, LG sizes and Image, Initials, and Fallback variants.' },
      { title: 'Badge System', prompt: 'Build a badge component with Neutral, Success, Warning, Error, and Info color variants in Small and Default sizes.' },
      { title: 'Card Variants', prompt: 'Create a card component set with Default, Outlined, Elevated, and Interactive variants.' },
      { title: 'Icon Button', prompt: 'Generate an icon button set with Ghost, Outlined, and Filled styles in Small, Medium, and Large sizes.' },
      { title: 'Tag Chips', prompt: 'Build a tag chip component with Removable and Static variants in six color options.' },
      { title: 'Radio Buttons', prompt: 'Create a radio button component in Unselected, Selected, Focused, and Disabled states.' },
      { title: 'Alert Banners', prompt: 'Generate alert banner components for Info, Success, Warning, and Error with optional dismiss button.' },
      { title: 'Breadcrumbs', prompt: 'Build a breadcrumb component with Default and Truncated variants showing separator options.' },
      { title: 'Dropdown Menu', prompt: 'Create a dropdown menu component with Item, Separator, Header, and Disabled Item sub-components.' },
      { title: 'Tooltip Set', prompt: 'Generate a tooltip component with Top, Bottom, Left, and Right placement variants.' },
      { title: 'Tab Bar', prompt: 'Build a tab bar component with Underline and Pill variants in Default, Active, and Disabled states.' },
      { title: 'Progress Bars', prompt: 'Create a progress bar set with Linear and Circular variants in SM, MD, LG sizes.' },
      { title: 'Skeleton Loader', prompt: 'Generate skeleton loader components for Text, Avatar, Card, and Table Row shapes.' },
      { title: 'Stepper', prompt: 'Build a stepper component showing Completed, Active, and Upcoming step states in horizontal and vertical layouts.' },
      { title: 'Pagination', prompt: 'Create a pagination component with Numbered, Prev/Next, and Compact variants.' },
      { title: 'Select Dropdown', prompt: 'Generate a select dropdown with Default, Open, Selected, Error, and Disabled states.' },
    ],
    'code-export': [
      { title: 'React Export', prompt: 'Export this as a React component with Tailwind classes.' },
      { title: 'Vue Export', prompt: 'Generate the Vue SFC for this card layout.' },
      { title: 'HTML/CSS', prompt: 'Export this design as clean semantic HTML with a scoped CSS stylesheet.' },
      { title: 'Svelte Component', prompt: 'Generate a Svelte component with scoped styles for this layout.' },
      { title: 'React Native', prompt: 'Export this screen as a React Native component using StyleSheet.' },
      { title: 'Next.js Page', prompt: 'Generate a Next.js page component with server-side props for this layout.' },
      { title: 'CSS Modules', prompt: 'Export this as a React component using CSS Modules for styling.' },
      { title: 'Styled Components', prompt: 'Generate this layout as a React component using styled-components.' },
      { title: 'Angular Template', prompt: 'Export this as an Angular component with its template and stylesheet.' },
      { title: 'Responsive CSS', prompt: 'Generate responsive HTML/CSS with mobile, tablet, and desktop breakpoints.' },
      { title: 'Tailwind Only', prompt: 'Export just the Tailwind class markup without a framework wrapper.' },
      { title: 'Accessibility Attrs', prompt: 'Export this as HTML with full ARIA attributes and semantic landmarks.' },
      { title: 'Flutter Widget', prompt: 'Generate a Flutter widget tree for this card layout.' },
      { title: 'SwiftUI View', prompt: 'Export this design as a SwiftUI View with native styling.' },
      { title: 'Design Tokens', prompt: 'Extract all colors, spacing, and typography as a JSON design token file.' },
      { title: 'Storybook Story', prompt: 'Generate a Storybook story file with controls for this component.' },
      { title: 'SCSS Variables', prompt: 'Export the design as HTML with SCSS using variables for all repeated values.' },
      { title: 'Web Component', prompt: 'Generate a native web component with Shadow DOM for this element.' },
      { title: 'Astro Component', prompt: 'Export this section as an Astro component with scoped styles.' },
      { title: 'Email Template', prompt: 'Generate an HTML email template compatible with major email clients.' },
    ],
    audit: [
      { title: 'Accessibility Check', prompt: 'Check this page for accessibility issues.' },
      { title: 'Contrast Audit', prompt: 'Audit the contrast ratios on all text elements.' },
      { title: 'Touch Targets', prompt: 'Check that all interactive elements meet the 44x44px minimum touch target size.' },
      { title: 'Focus Order', prompt: 'Verify the logical tab/focus order of all interactive elements on this screen.' },
      { title: 'Color Blindness', prompt: 'Audit this design for color blindness accessibility across all color variants.' },
      { title: 'Text Scaling', prompt: 'Check if the layout holds up when text is scaled to 200%.' },
      { title: 'Alt Text Review', prompt: 'Identify all images and icons that need alt text or aria-labels.' },
      { title: 'Spacing Consistency', prompt: 'Audit spacing values for inconsistencies and suggest a unified spacing scale.' },
      { title: 'Font Size Audit', prompt: 'Check that no text is smaller than 12px and all sizes follow a type scale.' },
      { title: 'Heading Hierarchy', prompt: 'Verify the heading levels follow a logical H1 through H6 hierarchy.' },
      { title: 'Link Visibility', prompt: 'Check that all links are visually distinguishable from surrounding text.' },
      { title: 'Form Labels', prompt: 'Audit all form inputs to ensure they have visible labels or accessible names.' },
      { title: 'Error States', prompt: 'Verify that error messages use more than just color to convey meaning.' },
      { title: 'Motion Check', prompt: 'Identify animations that should respect prefers-reduced-motion.' },
      { title: 'Alignment Audit', prompt: 'Check all elements for sub-pixel misalignment and off-grid positioning.' },
      { title: 'Overflow Check', prompt: 'Scan for text or elements that overflow their containers.' },
      { title: 'Dark Mode Audit', prompt: 'Verify all elements maintain sufficient contrast in a dark color scheme.' },
      { title: 'Responsive Audit', prompt: 'Check if this layout would break at common mobile viewport widths.' },
      { title: 'Naming Review', prompt: 'Audit the layer naming for clarity and consistency across the design.' },
      { title: 'Icon Sizing', prompt: 'Check that all icons use consistent sizing and align with adjacent text.' },
    ],
    critique: [
      { title: 'Full Review', prompt: 'Review this design and score it across all seven dimensions.' },
      { title: 'Visual Hierarchy', prompt: 'Critique the visual hierarchy — is there a clear focal point and reading order?' },
      { title: 'Spacing Audit', prompt: 'Evaluate the spacing and alignment consistency in this layout.' },
      { title: 'Color Review', prompt: 'Critique the color palette for harmony, contrast, and semantic meaning.' },
      { title: 'Typography Check', prompt: 'Review the typography for scale adherence, hierarchy, and readability.' },
      { title: 'Accessibility Score', prompt: 'Rate this design on accessibility and identify the top issues.' },
      { title: 'Polish Assessment', prompt: 'How polished is this design? Check for inconsistencies in radii, shadows, and spacing.' },
      { title: 'Layout Quality', prompt: 'Critique the auto-layout structure and responsiveness readiness.' },
      { title: 'Component Usage', prompt: 'Check if this design is using components and design system tokens effectively.' },
      { title: 'Dark Mode Ready', prompt: 'Assess whether this design is ready for a dark mode variant.' },
      { title: 'Design System Fit', prompt: 'Does this design follow the file design system? Score consistency.' },
      { title: 'Content Design', prompt: 'Critique the content: labels, CTAs, microcopy, and empty states.' },
      { title: 'Interaction States', prompt: 'Are hover, active, focus, disabled, and error states properly designed?' },
      { title: 'Grid Adherence', prompt: 'Check if elements sit on an 8px grid and spacing is from a consistent scale.' },
      { title: 'Icon Consistency', prompt: 'Review icons for style consistency, sizing, and alignment with text.' },
      { title: 'Layer Naming', prompt: 'Audit the layer tree for clear, consistent naming conventions.' },
      { title: 'Whitespace Balance', prompt: 'Critique the balance of whitespace — is it too tight, too loose, or just right?' },
      { title: 'CTA Clarity', prompt: 'Is the primary call-to-action clear and visually prominent?' },
      { title: 'Information Density', prompt: 'Rate the information density — is it overwhelming or well-organized?' },
      { title: 'Quick Score', prompt: 'Give a quick overall score and top 3 things to fix.' },
    ],
  };

  // Crossfade on mode switch: fade out old content, swap, fade in new
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayedMode, setDisplayedMode] = useState(mode);
  const prevModeRef2 = useRef(mode);

  useEffect(() => {
    if (mode !== prevModeRef2.current) {
      prevModeRef2.current = mode;
      const el = containerRef.current;
      if (!el) { setDisplayedMode(mode); return; }
      const fadeOut = el.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 120, easing: 'ease-out', fill: 'forwards' }
      );
      fadeOut.onfinish = () => {
        setDisplayedMode(mode);
        el.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 180, easing: 'ease-in', fill: 'forwards' }
        );
      };
    }
  }, [mode]);

  const examples = useMemo(
    () => shuffle(hints[displayedMode] ?? hints.generate).slice(0, 3),
    [displayedMode],
  );

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center h-full text-figma-text-secondary px-4">
      <div className="mb-3 opacity-50 text-figma-text-secondary">
        <ModeIcon mode={displayedMode} />
      </div>
      <div className="text-xl font-semibold text-figma-text mb-3">
        {getModeTitle(displayedMode)}
      </div>
      <div className="text-sm text-center mb-4 max-w-[280px]">
        {getModeDescription(displayedMode)}
      </div>
      <div className="space-y-2 w-full max-w-[300px]">
        {examples.map((hint, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onHintClick(hint.prompt)}
            className="w-full text-left text-sm text-figma-text-tertiary border border-figma-border rounded-[5px] px-3 py-2.5 leading-relaxed hover:border-figma-text-tertiary hover:text-figma-text transition-colors cursor-pointer"
          >
            <span className="font-semibold text-figma-text-secondary block mb-0.5">{hint.title}</span>
            {hint.prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModeIcon({ mode }: { mode: AppMode }) {
  const p = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (mode) {
    case 'generate':
      return (
        <svg {...p}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case 'modify':
      return (
        <svg {...p}>
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      );
    case 'style-transfer':
      return (
        <svg {...p}>
          <path d="M15 11.25L16.5 12.75L17.25 12V8.75798L19.5264 8.14802C20.019 8.01652 20.4847 7.75778 20.8712 7.37132C22.0428 6.19975 22.0428 4.30025 20.8712 3.12868C19.6996 1.95711 17.8001 1.95711 16.6286 3.12868C16.2421 3.51509 15.9832 3.98069 15.8517 4.47324L15.2416 6.74998H12L11.25 7.49998L12.75 8.99999M15 11.25L6.53033 19.7197C6.19077 20.0592 5.73022 20.25 5.25 20.25C4.76978 20.25 4.30924 20.4408 3.96967 20.7803L3 21.75L2.25 21L3.21967 20.0303C3.55923 19.6908 3.75 19.2302 3.75 18.75C3.75 18.2698 3.94077 17.8092 4.28033 17.4697L12.75 8.99999M15 11.25L12.75 8.99999" />
        </svg>
      );
    case 'components':
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'code-export':
      return (
        <svg {...p}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'audit':
      return (
        <svg {...p}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'critique':
      return (
        <svg {...p}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

function getModeTitle(mode: AppMode): string {
  const titles: Record<AppMode, string> = {
    generate: 'Design',
    modify: 'Modify',
    'style-transfer': 'Style Transfer',
    components: 'Components',
    'code-export': 'Code Export',
    audit: 'Conformance Checker',
    critique: 'Design Critique',
  };
  return titles[mode];
}

function getModeDescription(mode: AppMode): string {
  const descriptions: Record<AppMode, string> = {
    generate: 'Describe any UI and it will be created as editable Figma layers on your canvas.',
    modify: 'Select elements and describe what to change. Properties are updated in-place.',
    'style-transfer': 'Select a source element, then describe which targets should receive its styles.',
    components: 'Generate full component sets with Cartesian variants from a base element.',
    'code-export': 'Select a frame and export it as React, Vue, Svelte, or HTML/Tailwind code.',
    audit: 'Analyze your designs for WCAG accessibility compliance with fix suggestions.',
    critique: 'Get a structured design review with scores across 7 dimensions and actionable priorities.',
  };
  return descriptions[mode];
}

function getPlaceholder(mode: AppMode, selectionCount: number): string {
  if (mode === 'modify' && selectionCount === 0) {
    return 'Select elements first, then describe changes...';
  }
  if (mode === 'code-export' && selectionCount === 0) {
    return 'Select a frame to export as code...';
  }
  if (mode === 'critique' && selectionCount === 0) {
    return 'Select a frame to critique...';
  }
  const modeHints: Partial<Record<AppMode, string>> = {
    generate: 'Describe a design to generate...',
    critique: 'Ask for a design review...',
  };
  return modeHints[mode] ?? 'Describe what you want...';
}
