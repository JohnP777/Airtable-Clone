import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { faker } from '@faker-js/faker';

// Function to generate fake data for business columns
function generateFakeBusinessData() {
  return {
    columns: [
      { name: "Employee Name", order: 0 },
      { name: "Department", order: 1 },
      { name: "Email", order: 2 }
    ],
    rows: Array.from({ length: 5 }, (_, index) => ({
      order: index,
      cells: [
        { value: faker.person.fullName() },
        { value: faker.helpers.arrayElement(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Product']) },
        { value: faker.internet.email() }
      ]
    }))
  };
}

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

      // Generate fake business data
      const fakeData = generateFakeBusinessData();

      // Create a default table for the new base with 5 columns and 100 rows
      const table = await ctx.db.table.create({
        data: {
          baseId: base.id,
          name: "Employee Directory",
          order: 0,
          columns: {
            create: fakeData.columns
          },
          rows: {
            create: fakeData.rows.map(row => ({
              order: row.order
            }))
          },
          views: {
            create: [{ name: "Grid view", type: "grid", order: 0 }]
          }
        },
        include: {
          columns: true,
          rows: true
        }
      });

      // Create cells for all rows and columns with fake data
      const cellData = [];
      for (let rowIndex = 0; rowIndex < fakeData.rows.length; rowIndex++) {
        const row = fakeData.rows[rowIndex];
        const tableRow = table.rows[rowIndex];
        
        if (!row || !tableRow) continue;
        
        for (let colIndex = 0; colIndex < fakeData.columns.length; colIndex++) {
          const tableColumn = table.columns[colIndex];
          if (!tableColumn) continue;
          
          cellData.push({
            tableId: table.id,
            rowId: tableRow.id,
            columnId: tableColumn.id,
            value: row.cells[colIndex]?.value ?? ''
          });
        }
      }

      // Insert all cells at once
      if (cellData.length > 0) {
        await ctx.db.tableCell.createMany({
          data: cellData
        });
      }

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
      // Since we have cascade deletes in the schema, we can just delete the base
      // and all related data will be automatically deleted
      const deletedBase = await ctx.db.base.delete({
        where: {
          id: input.id,
          createdById: ctx.session.user.id,
        },
      });
      
      return { success: true, deletedBase };
    }),

  // Add a cleanup function to help manage database space
  cleanup: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Get database size info
      const tableCounts = await ctx.db.$transaction([
        ctx.db.base.count(),
        ctx.db.table.count(),
        ctx.db.tableRow.count(),
        ctx.db.tableCell.count(),
      ]);
      
      return {
        bases: tableCounts[0],
        tables: tableCounts[1],
        rows: tableCounts[2],
        cells: tableCounts[3],
      };
    }),

  // Emergency cleanup for large datasets
  emergencyCleanup: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Get all bases for the user
      const bases = await ctx.db.base.findMany({
        where: { createdById: userId },
        include: {
          tables: {
            include: {
              _count: {
                select: {
                  rows: true,
                  cells: true
                }
              }
            }
          }
        }
      });
      
      const results = [];
      
      for (const base of bases) {
        const totalRows = base.tables.reduce((sum, table) => sum + table._count.rows, 0);
        const totalCells = base.tables.reduce((sum, table) => sum + table._count.cells, 0);
        
        results.push({
          baseId: base.id,
          baseName: base.name,
          totalRows,
          totalCells,
          isLarge: totalRows > 1000 || totalCells > 5000
        });
      }
      
      return results;
    }),
}); 