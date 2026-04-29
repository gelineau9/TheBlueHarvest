'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const REDIRECT_SECONDS = 5;

export default function RegisterSuccessPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      router.push('/');
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, router]);

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-amber-900">Check Your Email</CardTitle>
          <CardDescription className="text-amber-700">
            We&apos;ve sent a verification link to your email address. Please check your inbox and
            click the link to activate your account before logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-amber-700 text-center">
            Didn&apos;t receive it? Check your spam folder.
          </p>
          <p className="text-xs text-amber-600 text-center">
            Redirecting to homepage in {seconds} second{seconds !== 1 ? 's' : ''}…
          </p>
          <Link href="/">
            <Button className="w-full bg-amber-900 text-amber-50">Go to Homepage Now</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
