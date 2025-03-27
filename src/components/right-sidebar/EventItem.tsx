export function EventItem({
    date,
    title,
    location,
  }: {
    date: string
    title: string
    location: string
  }) {
    return (
      <div className="flex gap-3 rounded-md border border-amber-800/20 bg-amber-50/50 p-3">
        <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-md bg-amber-100 text-center">
          <span className="text-xs font-medium text-amber-700">{date.split(" ")[0]}</span>
          <span className="text-sm font-bold text-amber-900">{date.split(" ")[1]}</span>
        </div>
        <div>
          <h3 className="font-medium text-amber-900">{title}</h3>
          <p className="text-sm text-amber-700">{location}</p>
        </div>
      </div>
    )
  }
