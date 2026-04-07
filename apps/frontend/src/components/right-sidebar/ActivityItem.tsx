import Link from 'next/link';

// ─── Post / Profile variant ───────────────────────────────────────────────────

interface PostActivityItemProps {
  kind: 'post' | 'profile';
  username: string;
  action: string;
  target: string;
  targetHref: string;
  time: string;
}

// ─── Comment variant ──────────────────────────────────────────────────────────

interface CommentActivityItemProps {
  kind: 'comment';
  username: string;
  usernameHref: string;
  postTitle: string;
  postHref: string;
  time: string;
}

type ActivityItemProps = PostActivityItemProps | CommentActivityItemProps;

export function ActivityItem(props: ActivityItemProps) {
  return (
    <div className="rounded-md border border-amber-800/20 bg-amber-50/50 p-3">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-amber-200"></div>
        <div>
          <p className="text-sm text-amber-800">
            {props.kind === 'comment' ? (
              <>
                <Link
                  href={props.usernameHref}
                  className="font-medium text-amber-900 hover:underline"
                >
                  {props.username}
                </Link>{' '}
                commented on{' '}
                <Link href={props.postHref} className="font-medium text-amber-900 hover:underline">
                  {props.postTitle}
                </Link>
              </>
            ) : (
              <>
                <span className="font-medium text-amber-900">{props.username}</span> {props.action}{' '}
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
