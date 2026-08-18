import Link from 'next/link';
import { User } from 'lucide-react';

// ─── Post / Profile variant ───────────────────────────────────────────────────

interface PostActivityItemProps {
  kind: 'post' | 'profile';
  username: string;
  usernameHref: string;
  action: string;
  target: string;
  targetHref: string;
  time: string;
  avatarUrl?: string | null;
}

// ─── Comment variant ──────────────────────────────────────────────────────────

interface CommentActivityItemProps {
  kind: 'comment';
  username: string;
  usernameHref: string;
  postTitle: string;
  postHref: string;
  time: string;
  avatarUrl?: string | null;
}

type ActivityItemProps = PostActivityItemProps | CommentActivityItemProps;

/**
 * The avatar belongs to the acting *profile* — the character who wrote the post
 * or left the comment — falling back to a silhouette when the actor is an
 * account rather than a character, or simply has no avatar set.
 */
function ActorAvatar({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    // Avatars come from Supabase Storage and render at 32px, so next/image adds
    // no value here.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="h-8 w-8 flex-shrink-0 rounded-full border border-amber-800/20 object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-200"
      aria-hidden="true"
      title={name}
    >
      <User className="h-4 w-4 text-amber-700" />
    </div>
  );
}

export function ActivityItem(props: ActivityItemProps) {
  return (
    <div className="rounded-md border border-amber-800/20 bg-amber-50/50 p-3">
      <div className="flex items-start gap-2">
        <ActorAvatar url={props.avatarUrl} name={props.username} />
        {/* min-w-0 lets this shrink below its content width; without it a long title overflows */}
        <div className="min-w-0">
          <p className="text-sm text-amber-800 break-words">
            {props.kind === 'comment' ? (
              <>
                <Link href={props.usernameHref} className="font-medium text-amber-900 hover:underline">
                  {props.username}
                </Link>{' '}
                commented on{' '}
                <Link href={props.postHref} className="font-medium text-amber-900 hover:underline">
                  {props.postTitle}
                </Link>
              </>
            ) : (
              <>
                <Link href={props.usernameHref} className="font-medium text-amber-900 hover:underline">
                  {props.username}
                </Link>{' '}
                {props.action}{' '}
                <Link href={props.targetHref} className="font-medium text-amber-900 hover:underline">
                  {props.target}
                </Link>
              </>
            )}
          </p>
          <p className="text-xs text-amber-700">{props.time}</p>
        </div>
      </div>
    </div>
  );
}
