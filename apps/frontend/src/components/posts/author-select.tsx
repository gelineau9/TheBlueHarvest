'use client';

import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/auth-provider';
import type { AuthorableProfile } from '@/hooks/useAuthorableProfiles';

interface AuthorSelectProps {
  /** Unique per rendered instance — the edit page renders one per post type */
  id: string;
  /** Selected profile id as a string; '' means "no character, credit the account" */
  value: string;
  onChange: (value: string) => void;
  /** Supplied by the caller so the edit page doesn't fetch the list twice */
  profiles: AuthorableProfile[];
  isLoading?: boolean;
  disabled?: boolean;
  /** Validation message from the surrounding form, if any */
  error?: string;
}

/**
 * The Author picker shared by every post create and edit form.
 *
 * Deliberately never says "optional": a trailing ` *` marks the required
 * fields, so its absence already carries that meaning. The empty option does
 * the explaining instead — it names the account that gets credited when no
 * character is chosen, rather than the blank "No author" it replaced.
 */
export function AuthorSelect({ id, value, onChange, profiles, isLoading, disabled, error }: AuthorSelectProps) {
  const { username } = useAuth();

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-amber-900 font-semibold">
        Author
      </Label>
      <p className="text-sm text-amber-700">
        Attribute this post to one of your characters or kinships. If you don&apos;t, it stays credited to your account.
      </p>
      {isLoading ? (
        <div className="text-sm text-amber-700">Loading your profiles...</div>
      ) : (
        <>
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          >
            <option value="">{username ? `My account (${username})` : 'My account'}</option>
            {profiles.map((profile) => (
              <option key={profile.profile_id} value={profile.profile_id}>
                {profile.name} ({profile.type_label})
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
