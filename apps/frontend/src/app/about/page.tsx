export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-fantasy mb-6 text-3xl font-bold text-amber-900">About &amp; Rules</h1>

      <div className="space-y-6 text-[#3a2921]">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-amber-800">About The Brandy Hall Archives</h2>
          <p className="leading-relaxed text-amber-900/80">
            <em>The Brandy Hall Archives</em> is a space for the writers, artists, and roleplayers of The Lord of the
            Rings Online&apos;s official roleplay server, Meriadoc, to share their original artwork and writing,
            advertise roleplaying events, and connect with other members of the community.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-amber-800">Community Guidelines</h2>
          <p className="leading-relaxed text-amber-900/80">
            Full rules and guidelines are coming soon. In the meantime, please treat all members with respect and ensure
            your content is appropriate for the community.
          </p>
        </section>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700">
          This page is a work in progress. Throughout <em>The Brandy Hall Archives</em>&apos; alpha, you may see
          changes to this page.
        </div>
      </div>
    </div>
  );
}
