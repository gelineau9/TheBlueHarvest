import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { LoginForm } from './login-form';
import { Button } from '../ui/button';

interface AuthDialogProps {
  trigger?: React.ReactNode;
}

export function AuthDialog({ trigger }: AuthDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || <Button variant="outline">Login</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-amber-50">
        <DialogHeader>
          <DialogTitle className="text-amber-900">Login to The Blue Harvest</DialogTitle>
        </DialogHeader>
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
}
