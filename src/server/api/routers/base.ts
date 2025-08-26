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
          name: input.name ?? "Untitled Base", // Changed from || to ??
          createdById: ctx.session.user.id,
        },
      });

      // Create a default table for the new base
      await ctx.db.table.create({
        data: {
          baseId: base.id,
          name: "Table 1",
          order: 0,
          columns: {
            create: [
              { name: "Name", order: 0 },
              { name: "Notes", order: 1 },
              { name: "Assignee", order: 2 },
              { name: "Status", order: 3 },
              { name: "Attachments", order: 4 }
            ]
          },
          rows: {
            create: [
              { order: 0 },
              { order: 1 },
              { order: 2 }
            ]
          },
          views: {
            create: [{ name: "Grid view", type: "grid", order: 0 }]
          }
        }
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
        select: { // Explicitly selecting fields for optimization
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          lastOpened: true,
          createdById: true,
        },
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