import { useEffect, useState } from 'react';
import { userApi } from '../lib/api';
import type { UserDto } from '@repo/shared';

export function SettingsPage() {
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [digestTime, setDigestTime] = useState(6);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await userApi.getProfile();
        setProfile(data);
        setName(data.name || '');
        setIsActive(data.isActive ?? true);
        setDigestTime(data.digestTime ?? 6);
      } catch (err) {
        setErrorMessage('Failed to load profile settings.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated = await userApi.updateProfile({
        name: name || undefined,
        isActive,
        digestTime,
      });
      setProfile(updated);
      setName(updated.name || '');
      setIsActive(updated.isActive ?? true);
      setDigestTime(updated.digestTime ?? 6);
      setSuccessMessage('Settings saved successfully.');
    } catch (err) {
      setErrorMessage('Failed to save settings.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
      </div>
    );
  }

  // Generate hours array (0 to 23)
  const hours = Array.from({ length: 24 }, (_, i) => {
    const suffix = i >= 12 ? 'PM' : 'AM';
    const displayHour = i % 12 === 0 ? 12 : i % 12;
    return {
      value: i,
      label: `${String(i).padStart(2, '0')}:00 (${displayHour} ${suffix})`,
    };
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Configure your personal details and daily email digest preferences.
        </p>
      </div>

      <div className="rounded-lg border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <form onSubmit={handleSave} className="space-y-6">
          {successMessage && (
            <div role="alert" className="rounded-md bg-status-completed-bg px-3 py-2 text-sm text-status-completed">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-md bg-status-failed-bg px-3 py-2 text-sm text-status-failed">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-ink-700 dark:text-ink-300">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={profile?.email || ''}
              disabled
              className="w-full rounded-md border border-ink-250 bg-ink-100 px-3 py-2 text-sm text-ink-500 cursor-not-allowed dark:border-ink-700 dark:bg-ink-950 dark:text-ink-400"
            />
            <p className="text-xs text-ink-400">Your email address is managed via your Google account credentials.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-ink-700 dark:text-ink-300">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 transition-colors focus:border-accent-500 focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
            />
          </div>

          <hr className="border-ink-200 dark:border-ink-800" />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Digest Preferences</h2>

            <div className="flex items-start gap-3">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-500 dark:border-ink-700 dark:bg-ink-950"
                />
              </div>
              <div className="text-sm">
                <label htmlFor="isActive" className="font-medium text-ink-700 dark:text-ink-300">
                  Enable Daily Digests
                </label>
                <p className="text-xs text-ink-400">
                  When checked, we will automatically fetch and compile summaries of your emails.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="digestTime" className="block text-sm font-medium text-ink-700 dark:text-ink-300">
                Scheduled Delivery Hour (UTC)
              </label>
              <select
                id="digestTime"
                value={digestTime}
                onChange={(e) => setDigestTime(Number(e.target.value))}
                className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 transition-colors focus:border-accent-500 focus:outline-none dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
              >
                {hours.map((hour) => (
                  <option key={hour.value} value={hour.value}>
                    {hour.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-400">
                Choose the UTC hour when your daily summary should be generated and push notifications dispatched.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center items-center rounded-md bg-accent-600 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
