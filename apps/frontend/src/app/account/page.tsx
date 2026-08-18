import { AccountForm } from '@/components/auth/account-form';
import { PublicProfileForm } from '@/components/auth/public-profile-form';

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4">
      <div className="flex items-center justify-center">
        <AccountForm />
      </div>
      <PublicProfileForm />
    </div>
  );
}
