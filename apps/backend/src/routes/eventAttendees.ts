/**
 * Event RSVP Routes
 *
 * Routes:
 *   GET    /api/posts/:postId/attendees             - Count (public) + list (organiser only)
 *   POST   /api/posts/:postId/attendees             - RSVP as one of your characters
 *   DELETE /api/posts/:postId/attendees/:profileId  - Withdraw an RSVP
 *
 * Visibility is deliberately split: the *number* attending is public, so anyone
 * can see whether an event still has room, while *who* is attending is visible
 * only to those who can edit the post. The count is what stops people being
 * turned away after the fact; the guest list is the organiser's business.
 *
 * The cap is enforced here rather than in the UI, so a stale page or a direct
 * request can't push an event past its maximum.
 *
 * Once the event's date has passed, RSVPs close: the guest list freezes into a
 * record of who attended. Only the organiser may still remove entries, to
 * correct the record.
 */

import { Router, Request, Response } from 'express';
import { sql } from 'slonik';
import { z } from 'zod';
import { body, validationResult } from 'express-validator';
import { getPool } from '../config/database.js';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middleware/auth.js';
import { canEditPost } from './editors.js';
import { logger } from '../utils/logger.js';

const router = Router();

const EVENT_POST_TYPE_ID = 4;

const EventSchema = z.object({
  post_id: z.number(),
  account_id: z.number(),
  post_type_id: z.number(),
  max_attendees: z.number().nullable(),
  ended: z.boolean(),
});

/** Loads the event and its cap, or null when the post isn't a live event */
async function loadEvent(db: Awaited<ReturnType<typeof getPool>>, postId: number) {
  return db.maybeOne(
    sql.type(EventSchema)`
      SELECT
        post_id,
        account_id,
        post_type_id,
        NULLIF(content->>'maxAttendees', '')::int AS max_attendees,
        COALESCE(NULLIF(content->>'eventDateTime', '')::timestamptz < NOW(), false) AS ended
      FROM posts
      WHERE post_id = ${postId} AND deleted = false
    `,
  );
}

async function countAttendees(db: Awaited<ReturnType<typeof getPool>>, postId: number) {
  const row = await db.one(
    sql.type(z.object({ count: z.number() }))`
      SELECT COUNT(*)::int AS count FROM event_attendees
      WHERE post_id = ${postId} AND deleted = false
    `,
  );
  return row.count;
}

// ─── GET /api/posts/:postId/attendees ────────────────────────────────────────

router.get('/:postId/attendees', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(String(req.params.postId), 10);
  if (isNaN(postId)) {
    res.status(400).json({ error: 'Invalid post ID' });
    return;
  }

  try {
    const db = await getPool();
    const event = await loadEvent(db, postId);

    if (!event || event.post_type_id !== EVENT_POST_TYPE_ID) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const count = await countAttendees(db, postId);
    const capacity = event.max_attendees;
    const isFull = capacity !== null && count >= capacity;

    // Which of the caller's own characters are attending — needed so the page
    // can offer "withdraw" instead of "RSVP". Only ever the caller's own.
    let myAttendance: Array<{ profile_id: number; name: string }> = [];
    if (req.userId) {
      myAttendance = [
        ...(await db.any(
          sql.type(z.object({ profile_id: z.number(), name: z.string() }))`
            SELECT ea.profile_id, p.name
            FROM event_attendees ea
            JOIN profiles p ON p.profile_id = ea.profile_id
            WHERE ea.post_id = ${postId} AND ea.deleted = false AND ea.account_id = ${req.userId}
            ORDER BY p.name
          `,
        )),
      ];
    }

    // The guest list itself is organiser-only.
    const canSeeList = req.userId ? await canEditPost(db, postId, req.userId) : false;
    let attendees: unknown[] | undefined;
    if (canSeeList) {
      attendees = [
        ...(await db.any(
          sql.type(
            z.object({
              profile_id: z.number(),
              name: z.string(),
              avatar_url: z.string().nullable(),
              username: z.string(),
              created_at: z.string(),
            }),
          )`
            SELECT
              p.profile_id,
              p.name,
              p.details->'avatar'->>'url' AS avatar_url,
              a.username,
              ea.created_at::text          AS created_at
            FROM event_attendees ea
            JOIN profiles p ON p.profile_id = ea.profile_id
            JOIN accounts a ON a.account_id = ea.account_id
            WHERE ea.post_id = ${postId} AND ea.deleted = false
            ORDER BY ea.created_at
          `,
        )),
      ];
    }

    res.json({
      count,
      capacity,
      is_full: isFull,
      ended: event.ended,
      can_see_attendees: canSeeList,
      my_attendance: myAttendance,
      ...(attendees ? { attendees } : {}),
    });
  } catch (err) {
    logger.error('Attendee fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/posts/:postId/attendees ───────────────────────────────────────

router.post(
  '/:postId/attendees',
  authenticateToken,
  [body('profile_id').isInt().withMessage('profile_id must be an integer')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const postId = parseInt(String(req.params.postId), 10);
    const profileId = Number(req.body.profile_id);
    const userId = req.userId!;

    if (isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    try {
      const db = await getPool();
      const event = await loadEvent(db, postId);

      if (!event || event.post_type_id !== EVENT_POST_TYPE_ID) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      // RSVPs close once the event has happened
      if (event.ended) {
        res.status(409).json({ error: 'event_ended', message: 'This event has already happened.' });
        return;
      }

      // You may only bring a character you own
      const owned = await db.maybeOne(
        sql.type(z.object({ profile_id: z.number() }))`
          SELECT profile_id FROM profiles
          WHERE profile_id = ${profileId} AND account_id = ${userId} AND deleted = false
        `,
      );
      if (!owned) {
        res.status(403).json({ error: 'That profile is not yours to bring' });
        return;
      }

      const alreadyAttending = await db.maybeOne(
        sql.type(z.object({ attendee_id: z.number() }))`
          SELECT attendee_id FROM event_attendees
          WHERE post_id = ${postId} AND profile_id = ${profileId} AND deleted = false
        `,
      );
      if (alreadyAttending) {
        res.status(200).json({ message: 'Already attending' });
        return;
      }

      // Cap check happens server-side so a stale page can't overfill the event
      if (event.max_attendees !== null) {
        const count = await countAttendees(db, postId);
        if (count >= event.max_attendees) {
          res.status(409).json({ error: 'event_full', message: 'This event is already full.' });
          return;
        }
      }

      // Unconditional unique index lets a withdrawn RSVP be restored here
      await db.query(
        sql.type(z.object({}))`
          INSERT INTO event_attendees (post_id, profile_id, account_id)
          VALUES (${postId}, ${profileId}, ${userId})
          ON CONFLICT (post_id, profile_id)
          DO UPDATE SET deleted = false, account_id = ${userId}, created_at = NOW()
        `,
      );

      res.status(201).json({ message: 'RSVP recorded', count: await countAttendees(db, postId) });
    } catch (err) {
      logger.error('RSVP error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ─── DELETE /api/posts/:postId/attendees/:profileId ──────────────────────────

router.delete('/:postId/attendees/:profileId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const postId = parseInt(String(req.params.postId), 10);
  const profileId = parseInt(String(req.params.profileId), 10);
  const userId = req.userId!;

  if (isNaN(postId) || isNaN(profileId)) {
    res.status(400).json({ error: 'Invalid identifiers' });
    return;
  }

  try {
    const db = await getPool();

    // Withdraw your own RSVP; the organiser may also remove an attendee
    const isOrganiser = await canEditPost(db, postId, userId);
    const scope = isOrganiser ? sql.fragment`` : sql.fragment`AND account_id = ${userId}`;

    // After the event, the list is a record of who attended — only the
    // organiser may still correct it.
    if (!isOrganiser) {
      const event = await loadEvent(db, postId);
      if (event?.ended) {
        res.status(409).json({ error: 'event_ended', message: 'This event has already happened.' });
        return;
      }
    }

    const removed = await db.maybeOne(
      sql.type(z.object({ attendee_id: z.number() }))`
        UPDATE event_attendees
        SET deleted = true
        WHERE post_id = ${postId} AND profile_id = ${profileId} AND deleted = false ${scope}
        RETURNING attendee_id
      `,
    );

    if (!removed) {
      res.status(404).json({ error: 'No RSVP found to withdraw' });
      return;
    }

    res.json({ message: 'RSVP withdrawn', count: await countAttendees(db, postId) });
  } catch (err) {
    logger.error('RSVP withdrawal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
