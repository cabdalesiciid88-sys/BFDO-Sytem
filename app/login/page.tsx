import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/features/auth/actions";

export const metadata = {
  title: "Sign in — BFDO Management System",
};

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>BFDO Management System</CardTitle>
          <CardDescription>
            Sign in with the account your administrator created for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
