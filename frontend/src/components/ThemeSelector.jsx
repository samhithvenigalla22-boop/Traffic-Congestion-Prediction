import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Check } from 'lucide-react';

const THEMES = [
  {
    id: 'light',
    name: 'Enterprise Light',
    badge: 'Standard',
    bg: '#f8fafc',
    primary: '#2563eb',
    accent: '#3b82f6',
    desc: 'Clean, high-contrast white & slate palette for transportation analytics',
  },
  {
    id: 'slate',
    name: 'Executive Dark',
    badge: 'Night Ops',
    bg: '#0f172a',
    primary: '#3b82f6',
    accent: '#60a5fa',
    desc: 'Restrained deep slate contrast without neon or glow effects',
  },
];

export default function ThemeSelector({ currentTheme = 'light', onSelectTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="theme-selector-container" ref={containerRef}>
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Toggle UI Color Theme"
        aria-label="Toggle UI Theme"
      >
        {activeThemeObj.id === 'light' ? (
          <Sun size={14} className="theme-icon text-amber-500" />
        ) : (
          <Moon size={14} className="theme-icon text-blue-400" />
        )}
        <span className="theme-btn-label">{activeThemeObj.name}</span>
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu">
          <div className="theme-dropdown-header">
            <span>Interface Mode</span>
          </div>

          <div className="theme-options-list">
            {THEMES.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-option-item ${isSelected ? 'active-theme' : ''}`}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="theme-option-left">
                    <span
                      className="theme-swatch"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.primary,
                      }}
                    ></span>
                    <div className="theme-option-text">
                      <div className="theme-name-row">
                        <span className="theme-opt-name">{theme.name}</span>
                        <span className="theme-opt-badge">{theme.badge}</span>
                      </div>
                      <span className="theme-opt-desc">{theme.desc}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="theme-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
