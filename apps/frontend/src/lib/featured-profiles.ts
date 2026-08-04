/**
 * Featured-profile syncing.
 *
 * Previously each form fired these requests without awaiting them and without
 * checking the response, so the post navigated away mid-flight and any server
 * rejection (unpublished profile, missing permission) was invisible. `fetch`
 * only rejects on network failure — a 403 or 404 resolves normally — so the
 * old `.catch()` never fired for the cases that actually happen.
 */

export interface FeaturedAdd {
  profile_id: number;
  name?: string;
}

export interface FeaturedRemove {
  featured_profile_id: number;
  name?: string;
}

export interface FeaturedSyncResult {
  ok: boolean;
  /** Human-readable messages, safe to show directly to the author */
  errors: string[];
}

function describe(name: string | undefined, fallbackId: number): string {
  return name ? `“${name}”` : `Profile ${fallbackId}`;
}

async function readError(res: Response): Promise<string | undefined> {
  const data = await res.json().catch(() => ({}));
  return typeof data?.error === 'string' ? data.error : undefined;
}

/**
 * Adds and/or removes featured profiles on a post, awaiting every request and
 * collecting failures instead of swallowing them.
 *
 * A 409 means the profile is already featured, which is the desired end state,
 * so it counts as success.
 */
export async function syncFeaturedProfiles(
  postId: number | string,
  { add = [], remove = [] }: { add?: FeaturedAdd[]; remove?: FeaturedRemove[] },
): Promise<FeaturedSyncResult> {
  const errors: string[] = [];

  await Promise.all([
    ...add.map(async (profile) => {
      const who = describe(profile.name, profile.profile_id);
      try {
        const res = await fetch(`/api/posts/${postId}/featured`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profile.profile_id }),
        });

        if (res.ok || res.status === 409) return; // 409 = already featured

        const serverError = await readError(res);
        if (serverError === 'Profile not found') {
          // The endpoint requires the profile to exist AND be published
          errors.push(`${who} could not be featured — make sure the profile is published.`);
        } else {
          errors.push(`${who} could not be featured — ${serverError ?? `request failed (${res.status})`}.`);
        }
      } catch {
        errors.push(`${who} could not be featured — the request did not reach the server.`);
      }
    }),

    ...remove.map(async (featured) => {
      const who = describe(featured.name, featured.featured_profile_id);
      try {
        const res = await fetch(`/api/posts/${postId}/featured/${featured.featured_profile_id}`, {
          method: 'DELETE',
        });

        if (res.ok || res.status === 404) return; // 404 = already gone

        const serverError = await readError(res);
        errors.push(`${who} could not be removed — ${serverError ?? `request failed (${res.status})`}.`);
      } catch {
        errors.push(`${who} could not be removed — the request did not reach the server.`);
      }
    }),
  ]);

  return { ok: errors.length === 0, errors };
}
