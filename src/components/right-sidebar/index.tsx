import { ActivityItem } from "./ActivityItem";
import { EventItem } from "./EventItem";


export function RightSidebar() {
    return (
      <div className="space-y-6">
        {/* Calendar */}
        <div>
          <h2 className="mb-3 font-fantasy text-xl font-semibold text-amber-900">Upcoming Events</h2>
          <div className="mb-4 rounded-lg border border-amber-800/20 bg-amber-50/50 p-4">
            <div className="mb-2 text-center font-medium text-amber-900">FEBRUARY 2025</div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              <div className="text-amber-700">Sun</div>
              <div className="text-amber-700">Mon</div>
              <div className="text-amber-700">Tue</div>
              <div className="text-amber-700">Wed</div>
              <div className="text-amber-700">Thu</div>
              <div className="text-amber-700">Fri</div>
              <div className="text-amber-700">Sat</div>
              {Array.from({ length: 28 }, (_, i) => (
                <div
                  key={i}
                  className={`rounded p-1 ${
                    [7, 14, 21, 28].includes(i + 1) ? "bg-amber-200/50 font-medium text-amber-900" : ""
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <EventItem date="Feb 21" title="Elven Festival Day" location="Rivendell" />
            <EventItem date="Feb 24" title="Hall & Fire Workshop" location="Bree-land" />
            <EventItem date="Feb 27" title="Dwarven Council Meeting" location="Thorin's Hall" />
            <EventItem date="Feb 28" title="At the Sign of the Prancing Pony" location="Bree" />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="mb-3 font-fantasy text-xl font-semibold text-amber-900">Recent Activity</h2>
          <div className="space-y-3">
            <ActivityItem username="Nenenas" action="liked a post by" target="Aranarion" time="2 hours ago" />
            <ActivityItem username="Aranarion" action="posted a piece of writing" target="'TBD'" time="3 hours ago" />
            <ActivityItem username="Eldarion" action="posted a piece of art" time="5 hours ago" />
            <ActivityItem username="Aranarion" action="commented 'LOL' on" target="Elva's post" time="6 hours ago" />
            <ActivityItem username="Nenenas" action="created a new character profile" time="1 day ago" />
            <ActivityItem username="Nenenas" action="joined" time="2 days ago" />
          </div>
        </div>
      </div>
    )
  }
