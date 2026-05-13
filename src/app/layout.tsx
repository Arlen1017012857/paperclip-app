import type { Metadata } from "next";
import { PostHogProvider } from "@/lib/posthog";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paperclip App",
  description: "Built with Next.js 15, tRPC, Drizzle ORM, and PostgreSQL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
