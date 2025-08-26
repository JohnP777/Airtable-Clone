import { postRouter } from "An/server/api/routers/post";
import { baseRouter } from "An/server/api/routers/base";
import { createCallerFactory, createTRPCRouter } from "An/server/api/trpc";
import { tableRouter } from "An/server/api/routers/table";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  base: baseRouter,
  table: tableRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
