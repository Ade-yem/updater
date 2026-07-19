import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useDigest } from '../hooks/useDigest';
import { BellIcon, BellOffIcon, LogoutIcon, MoonIcon, SpeakerIcon, SpeakerOffIcon, SunIcon } from './icons';

const toggleButtonClasses =
  'rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100';

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-accent-600 text-white'
      : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { push, voice } = useDigest();

  return (
    <header className="border-b border-ink-200 bg-ink-50/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="text-base font-semibold tracking-tight">Digest</span>
          <nav className="flex items-center gap-1" aria-label="Primary">
            <NavLink to="/digest/today" className={navLinkClasses}>
              Today
            </NavLink>
            <NavLink to="/digest/history" className={navLinkClasses}>
              History
            </NavLink>
            <NavLink to="/settings" className={navLinkClasses}>
              Settings
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={toggleButtonClasses}
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={push.toggle}
            disabled={!push.supported || push.permission === 'denied'}
            aria-pressed={push.enabled}
            aria-label={push.enabled ? 'Turn off push notifications' : 'Turn on push notifications'}
            title={
              !push.supported
                ? 'Not supported in this browser'
                : push.permission === 'denied'
                  ? 'Notifications are blocked in your browser settings'
                  : undefined
            }
            className={toggleButtonClasses}
          >
            {push.enabled ? <BellIcon className="h-4 w-4" /> : <BellOffIcon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={voice.toggle}
            disabled={!voice.supported}
            aria-pressed={voice.enabled}
            aria-label={voice.enabled ? 'Turn off voice announcements' : 'Turn on voice announcements'}
            title={!voice.supported ? 'Not supported in this browser' : undefined}
            className={toggleButtonClasses}
          >
            {voice.enabled ? <SpeakerIcon className="h-4 w-4" /> : <SpeakerOffIcon className="h-4 w-4" />}
          </button>

          {user?.email && (
            <NavLink
              to="/settings"
              className="hidden max-w-[10rem] truncate text-sm text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100 sm:inline"
            >
              {user.name || user.email}
            </NavLink>
          )}

          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
