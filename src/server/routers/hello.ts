import { z } from "zod";
import { publicProcedure, router } from "../trpc";

export const helloRouter = router({
  greet: publicProcedure
    .input(
      z.object({
        name: z.string().optional().default("World"),
      }),
    )
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name}!`,
        timestamp: new Date().toISOString(),
      };
    }),
});
