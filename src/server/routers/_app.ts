import { router } from "../trpc";
import { helloRouter } from "./hello";

/**
 * Root application router — merge all feature routers here.
 */
export const appRouter = router({
  hello: helloRouter,
});

export type AppRouter = typeof appRouter;
