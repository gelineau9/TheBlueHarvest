export function ActivityItem({
    username,
    action,
    target,
    time,
  }: {
    username: string
    action: string
    target?: string
    time: string
  }) {
    return (
      <div className="rounded-md border border-amber-800/20 bg-amber-50/50 p-3">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-amber-200"></div>
          <div>
            <p className="text-sm text-amber-800">
              <span className="font-medium text-amber-900">{username}</span> {action}{" "}
              {target && <span className="font-medium text-amber-900">{target}</span>}
            </p>
            <p className="text-xs text-amber-700">{time}</p>
          </div>
        </div>
      </div>
    )
  }
