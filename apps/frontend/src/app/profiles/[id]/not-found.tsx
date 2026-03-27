import Link from 'next/link';

export default function ProfileNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-cinzel text-5xl font-bold text-amber-900">404</h1>
      <h2 className="text-2xl font-semibold text-amber-800">Profile not found</h2>
      <p className="max-w-md text-amber-700">This profile does not exist, has been deleted, or is not accessible.</p>
      <Link
        href="/profiles"
        className="rounded-md bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      >
        Browse profiles
      </Link>
    </div>
  );
}
