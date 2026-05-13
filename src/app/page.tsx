import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          A modern web application starter.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-foreground text-background rounded-lg px-6 py-3 text-sm font-semibold transition-colors hover:opacity-90"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="border-border text-foreground rounded-lg border px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
