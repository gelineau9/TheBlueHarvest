/**
 * 0017_event_attendees.js
 *
 * RSVPs for event posts. Before this, an event could advertise a maximum number
 * of attendees but had no way to count them, so organisers had to turn people
 * away by hand after the fact — made worse by the site having no private
 * messaging to do it in.
 *
 * Attendance is by character profile, not by account: an event is attended in
 * character, and the same player may bring a different character to each one.
 *
 * The unique index is deliberately unconditional rather than partial. Withdrawing
 * an RSVP soft-deletes the row so it can be restored on a later re-RSVP via
 * ON CONFLICT, and a partial index (WHERE deleted = false) does not satisfy
 * ON CONFLICT — the mistake that made featured_profiles 500 for months.
 */

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      attendee_id  SERIAL PRIMARY KEY,
      post_id      INT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
      profile_id   INT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
      account_id   INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted      BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS event_attendees_post_profile_key
      ON event_attendees (post_id, profile_id);

    -- Counting live attendees for one event is the hot path
    CREATE INDEX IF NOT EXISTS idx_event_attendees_post
      ON event_attendees (post_id) WHERE deleted = false;

    -- "which of my characters is going" on the event page
    CREATE INDEX IF NOT EXISTS idx_event_attendees_account
      ON event_attendees (account_id) WHERE deleted = false;
  `);
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS event_attendees;`);
};
