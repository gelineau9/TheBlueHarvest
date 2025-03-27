import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5e6c8] p-4">
      <Link href="/" className="mb-8 text-center">
        <h1 className="font-fantasy text-3xl font-bold tracking-wide text-amber-900">Brandy Hall Archives</h1>
        <p className="text-amber-800">Your RP Portal to Middle-earth</p>
      </Link>

      <Card className="w-full max-w-md border-amber-800/20 bg-amber-50/80 shadow-md">
        <CardHeader>
          <CardTitle className="font-fantasy text-center text-2xl text-amber-900">Welcome Back</CardTitle>
          <CardDescription className="text-center text-amber-700">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-amber-900">
              Username
            </Label>
            <Input
              id="username"
              placeholder="Enter your username"
              className="border-amber-800/30 bg-amber-50 placeholder:text-amber-700/50 focus:border-amber-800 focus:ring-amber-800"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-amber-900">
                Password
              </Label>
              <Link href="/forgot-password" className="text-xs text-amber-800 hover:text-amber-900">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="border-amber-800/30 bg-amber-50 placeholder:text-amber-700/50 focus:border-amber-800 focus:ring-amber-800"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full bg-amber-800 text-amber-50 hover:bg-amber-700">Sign In</Button>
          <p className="text-center text-sm text-amber-700">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-amber-900 hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
