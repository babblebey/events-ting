import { postRouter } from "@/server/api/routers/post";
import { eventRouter } from "@/server/api/routers/event";
import { userRouter } from "@/server/api/routers/user";
import { ticketRouter } from "@/server/api/routers/ticket";
import { registrationRouter } from "@/server/api/routers/registration";
import { scheduleRouter } from "@/server/api/routers/schedule";
import { cfpRouter } from "@/server/api/routers/cfp";
import { speakerRouter } from "@/server/api/routers/speaker";
import { communicationRouter } from "@/server/api/routers/communication";
import { attendeesRouter } from "@/server/api/routers/attendees";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  event: eventRouter,
  user: userRouter,
  ticket: ticketRouter,
  registration: registrationRouter,
  schedule: scheduleRouter,
  cfp: cfpRouter,
  speaker: speakerRouter,
  communication: communicationRouter,
  attendees: attendeesRouter,
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
