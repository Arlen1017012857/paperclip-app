"use client";

import {
  createContext,
  useContext,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const PostHogContext = createContext<typeof posthog | null>(null);

export function usePostHog() {
  return useContext(PostHogContext);
}

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    ph.capture("$pageview", { $current_url: url });
  }, [ph, pathname, searchParams]);

  return null;
}

/**
 * PostHog provider for client-side analytics.
 * Mount this in your root layout (it no-ops if not configured).
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    if (
      typeof window === "undefined" ||
      !process.env.NEXT_PUBLIC_POSTHOG_KEY
    ) {
      return null;
    }
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      capture_pageview: false,
      loaded: (ph) => {
        if (process.env.NODE_ENV !== "production") ph.opt_out_capturing();
      },
    });
    return posthog;
  });

  return (
    <PostHogContext.Provider value={client}>
      <Suspense fallback={null}>
        <PostHogPageViewTracker />
      </Suspense>
      {children}
    </PostHogContext.Provider>
  );
}
