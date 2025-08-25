import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const baseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.create({
        data: {
          name: input.name ?? "Untitled Base",
          createdById: ctx.session.user.id,
        },
      });
      return base;
    }),

  getRecent: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const bases = await ctx.db.base.findMany({
        where: {
          createdById: ctx.session.user.id,
        },
        orderBy: {
          lastOpened: "desc",
        },
        take: input.limit,
      });
      return bases;
    }),

  updateLastOpened: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.update({
        where: {
          id: input.id,
          createdById: ctx.session.user.id,
        },
        data: {
          lastOpened: new Date(),
        },
      });
      return base;
    }),

  rename: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.update({
        where: {
          id: input.id,
          createdById: ctx.session.user.id,
        },
        data: {
          name: input.name,
        },
      });
      return base;
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.base.delete({
        where: {
          id: input.id,
          createdById: ctx.session.user.id,
        },
      });
      return { success: true };
    }),
}); 