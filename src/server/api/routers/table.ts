import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { Prisma } from "@prisma/client";
import { faker } from '@faker-js/faker';
import { TRPCError } from "@trpc/server";

// Configuration for bulk operations
const BULK_OPERATION_CONFIG = {
  BATCH_SIZE: 1000,
  MAX_CONCURRENT_BATCHES: 6,
  PROGRESS_UPDATE_INTERVAL: 100,
  ENABLE_FAST_PATH: true,
  // Use raw SQL for maximum performance when possible
  USE_RAW_SQL: false
};

// Function to generate fake data for business columns
function generateFakeBusinessData() {
  return {
    columns: [
      { name: "Employee Name", order: 0 },
      { name: "Department", order: 1 },
      { name: "Email", order: 2 }
    ],
    rows: Array.from({ length: 100 }, (_, index) => ({
      order: index,
      cells: [
        { value: faker.person.fullName() },
        { value: faker.helpers.arrayElement(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Product']) },
        { value: faker.internet.email() }
      ]
    }))
  };
}

// Function to generate fake data for existing columns
function generateFakeDataForColumns(columns: Array<{ id: string; name: string }>, rowCount: number) {
  return Array.from({ length: rowCount }, (_, index) => ({
    order: index,
    cells: columns.map(column => {
      switch (column.name.toLowerCase()) {
        case 'employee name':
        case 'name':
        case 'full name':
          return { value: faker.person.fullName() };
        case 'department':
        case 'team':
          return { value: faker.helpers.arrayElement(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Product']) };
        case 'email':
        case 'email address':
          return { value: faker.internet.email() };
        case 'salary':
        case 'pay':
        case 'compensation':
          return { value: `$${faker.number.int({ min: 45000, max: 180000 }).toLocaleString()}` };
        case 'start date':
        case 'hire date':
        case 'date':
          return { value: faker.date.past({ years: 3 }).toLocaleDateString() };
        case 'phone':
        case 'phone number':
          return { value: faker.phone.number() };
        case 'address':
        case 'location':
          return { value: faker.location.streetAddress() };
        case 'company':
        case 'organization':
          return { value: faker.company.name() };
        case 'job title':
        case 'position':
        case 'role':
          return { value: faker.person.jobTitle() };
        default:
          // Generate random data based on column name patterns
          if (column.name.toLowerCase().includes('name')) {
            return { value: faker.person.fullName() };
          } else if (column.name.toLowerCase().includes('email')) {
            return { value: faker.internet.email() };
          } else if (column.name.toLowerCase().includes('date')) {
            return { value: faker.date.past({ years: 3 }).toLocaleDateString() };
          } else if (column.name.toLowerCase().includes('phone')) {
            return { value: faker.phone.number() };
          } else if (column.name.toLowerCase().includes('address')) {
            return { value: faker.location.streetAddress() };
          } else {
            return { value: faker.lorem.word() };
          }
      }
    })
  }));
}

export const tableRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.table.findMany({
        where: { 
          baseId: input.baseId,
          base: { createdById: ctx.session.user.id }
        },
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true },
      });
    }),

  listViews: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findMany({
        where: {
          tableId: input.tableId,
          table: { base: { createdById: ctx.session.user.id } },
        },
        orderBy: { order: "asc" },
        select: { id: true, name: true, type: true, order: true },
      });
    }),

  createView: protectedProcedure
    .input(z.object({ tableId: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // verify access
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId, base: { createdById: ctx.session.user.id } },
        select: { id: true }
      });
      if (!table) throw new Error("Table not found");

      const count = await ctx.db.view.count({ where: { tableId: input.tableId } });
      const view = await ctx.db.view.create({
        data: {
          tableId: input.tableId,
          name: input.name ?? `Grid view ${count + 1}`,
          type: "grid",
          order: count,
        },
        select: { id: true, name: true, type: true, order: true }
      });
      return view;
    }),

  renameView: protectedProcedure
    .input(z.object({ viewId: z.string(), newName: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      // verify access
      const view = await ctx.db.view.findFirst({
        where: { 
          id: input.viewId, 
          table: { base: { createdById: ctx.session.user.id } } 
        }
      });
      if (!view) throw new Error("View not found");

      const updatedView = await ctx.db.view.update({
        where: { id: input.viewId },
        data: { name: input.newName },
        select: { id: true, name: true, type: true, order: true }
      });
      return updatedView;
    }),

  deleteView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // verify access
      const view = await ctx.db.view.findFirst({
        where: { 
          id: input.viewId, 
          table: { base: { createdById: ctx.session.user.id } } 
        },
        include: { table: true }
      });
      if (!view) throw new Error("View not found");

      // Check if this is the last view
      const viewCount = await ctx.db.view.count({ 
        where: { tableId: view.tableId } 
      });
      if (viewCount <= 1) {
        throw new Error("Cannot delete the last remaining view");
      }

      await ctx.db.view.delete({ where: { id: input.viewId } });
      return { success: true };
    }),

  duplicateView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // verify access and get original view
      const originalView = await ctx.db.view.findFirst({
        where: { 
          id: input.viewId, 
          table: { base: { createdById: ctx.session.user.id } } 
        },
        include: {
          sortRules: true,
          filterRules: true,
          table: true
        }
      });
      if (!originalView) throw new Error("View not found");

      const count = await ctx.db.view.count({ where: { tableId: originalView.tableId } });
      
      // Create new view
      const newView = await ctx.db.view.create({
        data: {
          tableId: originalView.tableId,
          name: `${originalView.name} copy`,
          type: originalView.type,
          order: count,
          hiddenFields: originalView.hiddenFields,
        },
        select: { id: true, name: true, type: true, order: true }
      });

      // Copy sort rules
      if (originalView.sortRules.length > 0) {
        await ctx.db.viewSortRule.createMany({
          data: originalView.sortRules.map(rule => ({
            viewId: newView.id,
            columnId: rule.columnId,
            direction: rule.direction,
            order: rule.order
          }))
        });
      }

      // Copy filter rules
      if (originalView.filterRules.length > 0) {
        await ctx.db.viewFilterRule.createMany({
          data: originalView.filterRules.map(rule => ({
            viewId: newView.id,
            columnId: rule.columnId,
            operator: rule.operator,
            value: rule.value,
            logicalOperator: (rule as any).logicalOperator, // Copy the logical operator
            order: rule.order
          }))
        });
      }

      return newView;
    }),

  getView: protectedProcedure
    .input(z.object({ viewId: z.string(), tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.viewId,
          tableId: input.tableId,
          table: { base: { createdById: ctx.session.user.id } },
        },
        include: {
          sortRules: { orderBy: { order: "asc" } },
          filterRules: { orderBy: { order: "asc" } },
        },
      });
      if (!view) throw new Error("View not found");
      return view;
    }),

  updateHiddenFields: protectedProcedure
    .input(z.object({
      viewId: z.string(),
      tableId: z.string(),
      hiddenFieldIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.viewId,
          tableId: input.tableId,
          table: { base: { createdById: ctx.session.user.id } },
        },
        select: { id: true },
      });
      if (!view) throw new Error("View not found");

      await ctx.db.view.update({
        where: { id: view.id },
        data: { hiddenFields: input.hiddenFieldIds },
      });
      return { success: true };
    }),

  // Get persisted state for a view (for hydrating contexts)
  getViewState: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Validate viewId is not empty
      if (!input.viewId || input.viewId.trim() === "") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "viewId cannot be empty" 
        });
      }

      const view = await ctx.db.view.findUnique({
        where: { id: input.viewId },
        include: {
          sortRules: { orderBy: { order: "asc" } },
          filterRules: { orderBy: { order: "asc" } },
        },
      });
      if (!view) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        hiddenFields: view.hiddenFields ?? [],
        sortRules: view.sortRules.map(r => ({ columnId: r.columnId, direction: r.direction as "asc"|"desc" })),
        filterRules: view.filterRules.map(r => ({
          columnId: r.columnId,
          operator: r.operator as
            | "contains" | "does not contain" | "is" | "is not" | "is empty" | "is not empty",
          value: r.value,
          logicalOperator: (r as any).logicalOperator as "AND" | "OR" | undefined,
        })),
      };
    }),

  // Set filter rules for a view
  setFilterRules: protectedProcedure
    .input(z.object({
      viewId: z.string(),
      rules: z.array(z.object({
        columnId: z.string(),
        operator: z.enum(["contains","does not contain","is","is not","is empty","is not empty"]),
        value: z.string(),
        logicalOperator: z.enum(["AND", "OR"]).nullable().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.viewFilterRule.deleteMany({ where: { viewId: input.viewId } }),
        ctx.db.viewFilterRule.createMany({
          data: input.rules.map((r, i) => ({
            viewId: input.viewId,
            columnId: r.columnId,
            operator: r.operator,
            value: r.value,
            logicalOperator: r.logicalOperator,
            order: i,
          })),
        }),
        ctx.db.view.update({ where: { id: input.viewId }, data: { updatedAt: new Date() } }),
      ]);
      return { ok: true };
    }),

  setSortRules: protectedProcedure
    .input(z.object({
      viewId: z.string(),
      sortRules: z.array(z.object({
        columnId: z.string(),
        direction: z.enum(["asc", "desc"]),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.viewSortRule.deleteMany({ where: { viewId: input.viewId } }),
        ctx.db.viewSortRule.createMany({
          data: input.sortRules.map((r, i) => ({
            viewId: input.viewId,
            columnId: r.columnId,
            direction: r.direction,
            order: i,
          })),
        }),
        ctx.db.view.update({ where: { id: input.viewId }, data: { updatedAt: new Date() } }),
      ]);
      return { ok: true };
    }),

  // Set hidden fields for a view (replaces the old updateHiddenFields)
  setHiddenFields: protectedProcedure
    .input(z.object({ viewId: z.string(), hiddenFieldIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.view.update({
        where: { id: input.viewId },
        data: { hiddenFields: input.hiddenFieldIds, updatedAt: new Date() },
      });
      return { ok: true };
    }),

  getTableData: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      sortRules: z.array(z.object({
        columnId: z.string(),
        direction: z.enum(["asc", "desc"])
      })).optional(),
      filterRules: z.array(z.object({
        columnId: z.string(),
        operator: z.string(),
        value: z.string(),
        logicalOperator: z.enum(["AND", "OR"]).nullable().optional()
      })).optional()
    }))
    .query(async ({ ctx, input }) => {
      // BLOCKED: This endpoint is disabled for large tables to prevent OOM crashes
      // Use getTableDataPaginated instead for tables with more than 2000 rows
      const rowCount = await ctx.db.tableRow.count({ where: { tableId: input.tableId } });
      if (rowCount > 2000) {
        throw new Error(
          `getTableData disabled for large tables (${rowCount.toLocaleString()} rows). Use getTableDataPaginated instead.`
        );
      }

      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            createdById: ctx.session.user.id
          }
        },
        include: {
          columns: {
            orderBy: { order: "asc" }
          },
          rows: {
        orderBy: { order: "asc" },
        include: {
          cells: {
            include: {
              column: true
            }
          }
        }
          }
        }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      let filteredRows = [...table.rows];

      // Apply filtering if filter rules are provided
      if (input.filterRules && input.filterRules.length > 0) {
        // Filter out rules with empty values (except for "is empty" and "is not empty" operators)
        const validFilters = input.filterRules.filter(f => {
          if (f.operator === "is empty" || f.operator === "is not empty") {
            return true; // These operators don't need values
          }
          return f.value && f.value.trim() !== ""; // Only include filters with non-empty values
        });

        if (validFilters.length > 0) {
          filteredRows = filteredRows.filter(row => {
            // Process filters with proper AND/OR logic
            let result = true;
            
            validFilters.forEach((filterRule, idx) => {
              const cell = row.cells.find(cell => cell.columnId === filterRule.columnId);
              const cellValue = cell?.value ?? "";
              
              let condition: boolean;
              switch (filterRule.operator) {
                case "contains":
                  condition = cellValue.toLowerCase().includes(filterRule.value.toLowerCase());
                  break;
                case "does not contain":
                  condition = !cellValue.toLowerCase().includes(filterRule.value.toLowerCase());
                  break;
                case "is":
                  condition = cellValue.toLowerCase() === filterRule.value.toLowerCase();
                  break;
                case "is not":
                  condition = cellValue.toLowerCase() !== filterRule.value.toLowerCase();
                  break;
                case "is empty":
                  condition = cellValue === "" || cellValue === null || cellValue === undefined;
                  break;
                case "is not empty":
                  condition = cellValue !== "" && cellValue !== null && cellValue !== undefined;
                  break;
                default:
                  condition = true;
              }

              if (idx === 0) {
                // First condition - set the initial result
                result = condition;
              } else {
                // Subsequent conditions - apply the logical operator (default to AND if null)
                const logicalOp = filterRule.logicalOperator || "AND";
                if (logicalOp === "AND") {
                  result = result && condition;
                } else {
                  result = result || condition;
                }
              }
            });

            return result;
          });
        }
      }

      // Apply sorting if sort rules are provided
      if (input.sortRules && input.sortRules.length > 0) {
        const sortedRows = [...filteredRows].sort((a, b) => {
          // Apply each sort rule in order (hierarchy)
          for (const sortRule of input.sortRules!) {
            const aCell = a.cells.find(cell => cell.columnId === sortRule.columnId);
            const bCell = b.cells.find(cell => cell.columnId === sortRule.columnId);
            
            const aValue = aCell?.value ?? "";
            const bValue = bCell?.value ?? "";
            
            // Check if this is a number column
            const column = table.columns.find(col => col.id === sortRule.columnId);
            const isNumberColumn = column?.type === 'number';
            
            if (isNumberColumn) {
              // For number columns, treat empty cells as less than 0
              const aNumeric = aValue === "" ? -1 : parseFloat(aValue);
              const bNumeric = bValue === "" ? -1 : parseFloat(bValue);
              
              if (!isNaN(aNumeric) && !isNaN(bNumeric)) {
                // Numeric comparison
                if (aNumeric !== bNumeric) {
                  return sortRule.direction === "asc" ? aNumeric - bNumeric : bNumeric - aNumeric;
                }
              } else {
                // If one is NaN, treat it as less than valid numbers
                const aValid = !isNaN(aNumeric);
                const bValid = !isNaN(bNumeric);
                if (aValid !== bValid) {
                  return sortRule.direction === "asc" ? (aValid ? 1 : -1) : (aValid ? -1 : 1);
                }
              }
            } else {
              // For text columns, use string comparison
              const comparison = aValue.localeCompare(bValue);
              if (comparison !== 0) {
                return sortRule.direction === "asc" ? comparison : -comparison;
              }
            }
            // If values are equal, continue to next sort rule
          }
          return 0; // If all sort rules are equal, maintain original order
        });
        
        // Return table with filtered and sorted rows
        return {
          ...table,
          rows: sortedRows
        };
      }
      
      // Return table with filtered rows (no sorting)
      return {
        ...table,
        rows: filteredRows
      };
    }),

  applySort: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      viewId: z.string(),
      sortRules: z.array(z.object({
        columnId: z.string(),
        direction: z.enum(["asc", "desc"])
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      let view = await ctx.db.view.findFirst({
        where: {
          id: input.viewId,
          tableId: input.tableId,
          table: { base: { createdById: ctx.session.user.id } }
        },
        select: { id: true }
      });
      if (!view) {
        view = await ctx.db.view.findFirst({
          where: {
            tableId: input.tableId,
            table: { base: { createdById: ctx.session.user.id } }
          },
          select: { id: true }
        });
        if (!view) {
          const created = await ctx.db.view.create({
            data: { tableId: input.tableId, name: "Grid view", type: "grid", order: 0 },
            select: { id: true }
          });
          view = created;
        }
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.viewSortRule.deleteMany({ where: { viewId: view!.id } });
        if (input.sortRules.length) {
          await tx.viewSortRule.createMany({
            data: input.sortRules.map((r, i) => ({
              viewId: view!.id,
              columnId: r.columnId,
              direction: r.direction,
              order: i
            }))
          });
        }
      });

      return {
        success: true,
        sortRules: input.sortRules,
        message: "Sort rules saved to view"
      };
    }),

  createTable: protectedProcedure
    .input(z.object({ 
      baseId: z.string(),
      name: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the base
      const base = await ctx.db.base.findFirst({
        where: { 
          id: input.baseId,
          createdById: ctx.session.user.id 
        }
      });

      if (!base) {
        throw new Error("Base not found");
      }

      const tableCount = await ctx.db.table.count({ 
        where: { baseId: input.baseId } 
      });

      // Generate fake business data
      const fakeData = generateFakeBusinessData();

      // Create table with fake data structure
      const table = await ctx.db.table.create({
        data: {
          baseId: input.baseId,
          name: input.name || `Table ${tableCount + 1}`,
          order: tableCount,
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

      return table;
    }),

  updateCell: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      rowId: z.string(),
      columnId: z.string(),
      value: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: { 
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      // Verify the row exists
      const row = await ctx.db.tableRow.findFirst({
        where: { 
          id: input.rowId,
          tableId: input.tableId
        }
      });

      if (!row) {
        throw new Error("Row not found");
      }

      // Verify the column exists
      const column = await ctx.db.tableColumn.findFirst({
        where: { 
          id: input.columnId,
          tableId: input.tableId
        }
      });

      if (!column) {
        throw new Error("Column not found");
      }

      const cell = await ctx.db.tableCell.upsert({
        where: {
          tableId_rowId_columnId: {
            tableId: input.tableId,
            rowId: input.rowId,
            columnId: input.columnId
          }
        },
        update: { value: input.value },
        create: {
          tableId: input.tableId,
          rowId: input.rowId,
          columnId: input.columnId,
          value: input.value
        }
      });

      return cell;
    }),

  updateColumn: protectedProcedure
    .input(z.object({
      columnId: z.string(),
      name: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the column's table
      const column = await ctx.db.tableColumn.findFirst({
        where: { 
          id: input.columnId,
          table: { base: { createdById: ctx.session.user.id } }
        }
      });

      if (!column) {
        throw new Error("Column not found");
      }

      const updatedColumn = await ctx.db.tableColumn.update({
        where: { id: input.columnId },
        data: { name: input.name }
      });

      return updatedColumn;
    }),

  addRow: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: { 
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        },
        include: { columns: true }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      // Find the next available order number to avoid conflicts
      const maxOrderRow = await ctx.db.tableRow.findFirst({
        where: { tableId: input.tableId },
        orderBy: { order: "desc" },
        select: { order: true }
      });
      
      const nextOrder = (maxOrderRow?.order ?? -1) + 1;

      const row = await ctx.db.tableRow.create({
        data: {
          tableId: input.tableId,
          order: nextOrder
        }
      });

      // Create cells for the new row
      const cells = table.columns.map(column => ({
        tableId: input.tableId,
        rowId: row.id,
        columnId: column.id,
        value: ""
      }));

      await ctx.db.tableCell.createMany({
        data: cells
      });

      return row;
    }),

  addColumn: protectedProcedure
    .input(z.object({ 
      tableId: z.string(),
      name: z.string().optional(), // Optional custom name
      type: z.enum(['text', 'number']).default('text') // Column type with default
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: { 
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        },
        include: { rows: true }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      const columnCount = await ctx.db.tableColumn.count({ 
        where: { tableId: input.tableId } 
      });

      const column = await ctx.db.tableColumn.create({
        data: {
          tableId: input.tableId,
          name: input.name ?? `Column ${columnCount + 1}`, // Use custom name or default
          type: input.type,
          order: columnCount
        }
      });

      // Create cells for the new column
      const cells = table.rows.map(row => ({
        tableId: input.tableId,
        rowId: row.id,
        columnId: column.id,
        value: ""
      }));

      await ctx.db.tableCell.createMany({
        data: cells
      });

      return column;
    }),

  deleteColumn: protectedProcedure
    .input(z.object({ 
      tableId: z.string(),
      columnId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: { 
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        },
        include: { columns: true }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      // Check if this is the only column (can't delete the last column)
      if (table.columns.length <= 1) {
        throw new Error("Cannot delete the last column");
      }

      // Check if this is the first column (primary field)
      const columnToDelete = table.columns.find(col => col.id === input.columnId);
      if (!columnToDelete) {
        throw new Error("Column not found");
      }

      if (columnToDelete.order === 0) {
        throw new Error("Cannot delete the primary field");
      }

      // Delete all cells for this column first
      await ctx.db.tableCell.deleteMany({
        where: {
          tableId: input.tableId,
          columnId: input.columnId
        }
      });

      // Delete the column
      await ctx.db.tableColumn.delete({
        where: {
          id: input.columnId
        }
      });

      // Update the order of remaining columns
      const remainingColumns = table.columns
        .filter(col => col.id !== input.columnId)
        .sort((a, b) => a.order - b.order);

      for (let i = 0; i < remainingColumns.length; i++) {
        await ctx.db.tableColumn.update({
          where: { id: remainingColumns[i]!.id },
          data: { order: i }
        });
      }

      return { success: true };
    }),

  // Reorder two rows within a view by swapping their positions
  reorderRows: protectedProcedure
    .input(z.object({
      viewId: z.string(),
      tableId: z.string(),
      aRowId: z.string(),
      bRowId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.viewId,
          tableId: input.tableId,
          table: { base: { createdById: ctx.session.user.id } }
        },
        select: { id: true }
      });
      if (!view) throw new Error("View not found");

      await ctx.db.$transaction(async (tx) => {
        const existing = await tx.viewRowOrder.findMany({
          where: { viewId: input.viewId, rowId: { in: [input.aRowId, input.bRowId] } }
        });
        const a = existing.find(e => e.rowId === input.aRowId);
        const b = existing.find(e => e.rowId === input.bRowId);

        const ensure = async (rowId: string, current: number | undefined | null) => {
          if (typeof current === 'number') return current;
          const max = await tx.viewRowOrder.aggregate({
            _max: { position: true },
            where: { viewId: input.viewId }
          });
          const next = (max._max.position ?? -1) + 1;
          await tx.viewRowOrder.upsert({
            where: { viewId_rowId: { viewId: input.viewId, rowId } },
            create: { viewId: input.viewId, rowId, position: next },
            update: { position: next }
          });
          return next;
        };

        const aPos = await ensure(input.aRowId, a?.position);
        const bPos = await ensure(input.bRowId, b?.position);

        await Promise.all([
          tx.viewRowOrder.update({
            where: { viewId_rowId: { viewId: input.viewId, rowId: input.aRowId } },
            data: { position: bPos }
          }),
          tx.viewRowOrder.update({
            where: { viewId_rowId: { viewId: input.viewId, rowId: input.bRowId } },
            data: { position: aPos }
          })
        ]);
      });

      return { success: true };
    }),

  //Used for adding 10k rows (not used anymore)
  addBulkRows: protectedProcedure
    .input(z.object({ 
      tableId: z.string(),
      rowCount: z.number().min(1).max(10000)
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: { 
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        },
        include: { 
          columns: { orderBy: { order: "asc" } }
        }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      const currentRowCount = await ctx.db.tableRow.count({ where: { tableId: input.tableId } });
      const startOrder = currentRowCount;

      // Generate fake data for existing columns
      const fakeData = generateFakeDataForColumns(table.columns, input.rowCount);

      // Use a single transaction for better performance
      const result = await ctx.db.$transaction(async (tx) => {
        // Create all rows at once
        const rowData = fakeData.map((row, index) => ({
          tableId: input.tableId,
          order: startOrder + index
        }));

        await tx.tableRow.createMany({
          data: rowData
        });

        // Get all created row IDs in one query
        const createdRows = await tx.tableRow.findMany({
          where: { 
            tableId: input.tableId,
            order: { gte: startOrder }
          },
          select: { id: true, order: true },
          orderBy: { order: "asc" }
        });

        // Prepare all cell data in memory
        const allCellData = [];
        for (let i = 0; i < fakeData.length; i++) {
          const row = fakeData[i];
          const rowId = createdRows[i]?.id;
          if (!rowId || !row) continue;

          for (let j = 0; j < table.columns.length; j++) {
            const column = table.columns[j];
            if (!column) continue;
            
            const cellValue = row.cells[j]?.value ?? '';
            
            allCellData.push({
              tableId: input.tableId,
              rowId: rowId,
              columnId: column.id,
              value: cellValue
            });
          }
        }

        // Create all cells in batches of 1000 for optimal performance
        const cellBatchSize = 1000;
        for (let i = 0; i < allCellData.length; i += cellBatchSize) {
          const batch = allCellData.slice(i, i + cellBatchSize);
          await tx.tableCell.createMany({
            data: batch,
            skipDuplicates: true // Skip if unique constraint violation
          });
        }

        return { createdRows: createdRows.length, cellData: allCellData.length };
      });

      return { 
        success: true, 
        addedRows: result.createdRows,
        totalRows: currentRowCount + result.createdRows,
        cellsCreated: result.cellData
      };
    }),

  // Fast bulk row addition using optimized batching
  // Optimized for large datasets with stable transaction handling
  addBulkRowsFast: protectedProcedure
    .input(z.object({ 
      tableId: z.string(),
      rowCount: z.number().min(1).max(1000000)
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: { 
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        },
        include: { 
          columns: { orderBy: { order: "asc" } }
        }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      // Find the next available order number to ensure proper sequencing
      const maxOrderRow = await ctx.db.tableRow.findFirst({
        where: { tableId: input.tableId },
        orderBy: { order: "desc" },
        select: { order: true }
      });
      
      const startOrder = (maxOrderRow?.order ?? -1) + 1;

      // Don't pre-generate all fake data - generate per batch to prevent memory issues
      // const fakeData = generateFakeDataForColumns(table.columns, input.rowCount);

      // Use much larger batches and concurrent processing for maximum performance
      const batchSize = BULK_OPERATION_CONFIG.BATCH_SIZE;
      const totalBatches = Math.ceil(input.rowCount / batchSize);
      let totalCreatedRows = 0;

      // Process batches with controlled concurrency to avoid overwhelming the database
      // Note: Reduced batch size and concurrency to prevent transaction timeouts
      const processBatch = async (batchIndex: number) => {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, input.rowCount);
        // Generate fake data for this batch only to prevent memory issues
        const batch = generateFakeDataForColumns(table.columns, endIndex - startIndex);
        
        // Use a transaction for each batch to ensure atomicity
        // Smaller batch sizes prevent transaction timeouts (was hitting 5s limit)
        return await ctx.db.$transaction(async (tx) => {
          // Create rows for this batch with sequential ordering
          const rowData = batch.map((row, index) => ({
            tableId: input.tableId,
            order: startOrder + startIndex + index
          }));

          // Create all rows for this batch at once
          await tx.tableRow.createMany({
            data: rowData
          });

          // Get the created row IDs for this batch
          const rowIds = await tx.tableRow.findMany({
            where: {
              tableId: input.tableId,
              order: { gte: startOrder + startIndex, lt: startOrder + endIndex }
            },
            select: { id: true, order: true },
            orderBy: { order: "asc" }
          });

          // Prepare all cell data for this batch
          const batchCellData = [];
          for (let j = 0; j < batch.length; j++) {
            const row = batch[j];
            const rowId = rowIds[j]?.id;
            if (!rowId || !row) continue;

            for (let k = 0; k < table.columns.length; k++) {
              const column = table.columns[k];
              if (!column) continue;
              
              const cellValue = row.cells[k]?.value ?? '';
              
              batchCellData.push({
                tableId: input.tableId,
                rowId: rowId,
                columnId: column.id,
                value: cellValue
              });
            }
          }

          // Create all cells for this batch at once
          if (batchCellData.length > 0) {
            // Chunk cell creation to prevent memory issues with large batches
            const CELL_CHUNK_SIZE = 5000;
            for (let k = 0; k < batchCellData.length; k += CELL_CHUNK_SIZE) {
              const cellChunk = batchCellData.slice(k, k + CELL_CHUNK_SIZE);
              await tx.tableCell.createMany({
                data: cellChunk,
                skipDuplicates: true
              });
            }
          }

          return batch.length;
        });
      };

      // Process batches with controlled concurrency
      const batchPromises = [];
      console.log(`Processing ${totalBatches} batches of ${batchSize} rows each for ${input.rowCount} total rows`);
      
      for (let i = 0; i < totalBatches; i += BULK_OPERATION_CONFIG.MAX_CONCURRENT_BATCHES) {
        const concurrentBatch = [];
        for (let j = 0; j < BULK_OPERATION_CONFIG.MAX_CONCURRENT_BATCHES && i + j < totalBatches; j++) {
          concurrentBatch.push(processBatch(i + j));
        }
        
        // Wait for current concurrent batch to complete before starting next
        const batchResults = await Promise.all(concurrentBatch);
        totalCreatedRows += batchResults.reduce((sum, count) => sum + count, 0);
        
        // Log progress for large operations
        if (input.rowCount > 10000) {
          console.log(`Completed ${totalCreatedRows}/${input.rowCount} rows (${Math.round((totalCreatedRows / input.rowCount) * 100)}%)`);
        }
      }

      return { 
        success: true, 
        addedRows: totalCreatedRows,
        totalRows: startOrder + totalCreatedRows
      };
    }),

  getTableDataPaginated: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      viewId: z.string().optional(),
      page: z.number().min(0).default(0),
      pageSize: z.number().min(1).max(100).default(50),
      sortRules: z.array(z.object({
        columnId: z.string(),
        direction: z.enum(["asc", "desc"])
      })).optional(),
      filterRules: z.array(z.object({
        columnId: z.string(),
        operator: z.enum([
          "contains", "does not contain",
          "is", "is not",
          "is empty", "is not empty"
        ]),
        value: z.string().default(""),
        logicalOperator: z.enum(["AND", "OR"]).nullable().optional()
      })).optional()
    }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: { createdById: ctx.session.user.id }
        },
        include: { columns: { orderBy: { order: "asc" } } }
      });
      if (!table) throw new Error("Table not found");

      let effectiveSort = input.sortRules ?? [];
      let effectiveFilter = input.filterRules ?? [];

      if (input.viewId && (!effectiveSort.length || !effectiveFilter.length)) {
        let view = await ctx.db.view.findFirst({
          where: {
            id: input.viewId,
            tableId: input.tableId,
            table: { base: { createdById: ctx.session.user.id } }
          },
          include: {
            sortRules: { orderBy: { order: "asc" } },
            filterRules: { orderBy: { order: "asc" } }
          }
        });
        if (!view) {
          view = await ctx.db.view.findFirst({
            where: {
              tableId: input.tableId,
              table: { base: { createdById: ctx.session.user.id } }
            },
            include: {
              sortRules: { orderBy: { order: "asc" } },
              filterRules: { orderBy: { order: "asc" } }
            }
          });
        }
        if (view) {
          if (!effectiveSort.length && view.sortRules?.length) {
            effectiveSort = view.sortRules.map(r => ({ columnId: r.columnId, direction: r.direction as "asc" | "desc" }));
          }
          if (!effectiveFilter.length && view.filterRules?.length) {
            effectiveFilter = view.filterRules.map(r => ({ columnId: r.columnId, operator: r.operator as any, value: r.value ?? "", logicalOperator: (r as any).logicalOperator as "AND" | "OR" | undefined }));
          }
        }
      }

      const joins: Prisma.Sql[] = [];
      const whereParts: Prisma.Sql[] = [Prisma.sql`tr."tableId" = ${input.tableId}`];

      // Process filters with proper AND/OR logic
      if (effectiveFilter.length > 0) {
        // Filter out rules with empty values (except for "is empty" and "is not empty" operators)
        const validFilters = effectiveFilter.filter(f => {
          if (f.operator === "is empty" || f.operator === "is not empty") {
            return true; // These operators don't need values
          }
          return f.value && f.value.trim() !== ""; // Only include filters with non-empty values
        });

        if (validFilters.length === 0) {
          // No valid filters, don't apply any filtering
        } else {
          // Build the filter conditions with proper AND/OR logic
          const conditions: Prisma.Sql[] = [];
          
          validFilters.forEach((f, idx) => {
            const alias = Prisma.raw(`f${idx}`);
            joins.push(Prisma.sql`
              LEFT JOIN "TableCell" ${alias}
                ON ${alias}."rowId" = tr.id AND ${alias}."columnId" = ${f.columnId}
            `);
            
            const v = (f.value ?? "").toLowerCase();
            const like = `%${v}%`;
            let condition: Prisma.Sql;
            
            switch (f.operator) {
              case "contains":
                condition = Prisma.sql`LOWER(COALESCE(${alias}.value, '')) LIKE ${like}`;
                break;
              case "does not contain":
                condition = Prisma.sql`(LOWER(COALESCE(${alias}.value, '')) NOT LIKE ${like})`;
                break;
              case "is":
                condition = Prisma.sql`LOWER(COALESCE(${alias}.value, '')) = ${v}`;
                break;
              case "is not":
                condition = Prisma.sql`LOWER(COALESCE(${alias}.value, '')) <> ${v}`;
                break;
              case "is empty":
                condition = Prisma.sql`${alias}.value IS NULL OR ${alias}.value = ''`;
                break;
              case "is not empty":
                condition = Prisma.sql`${alias}.value IS NOT NULL AND ${alias}.value <> ''`;
                break;
              default:
                condition = Prisma.sql`TRUE`;
            }

            if (idx === 0) {
              // First condition - always add it
              conditions.push(condition);
            } else {
              // Subsequent conditions - use the logical operator (default to AND if null)
              const logicalOp = f.logicalOperator || "AND";
              if (logicalOp === "AND") {
                conditions.push(Prisma.sql`AND ${condition}`);
              } else {
                conditions.push(Prisma.sql`OR ${condition}`);
              }
            }
          });

          // Join all conditions
          if (conditions.length > 0) {
            whereParts.push(Prisma.join(conditions, ' '));
          }
        }
      }

      const orderParts: Prisma.Sql[] = [];
      // If no explicit sort, and a view is provided, respect per-view manual order first
      if (!effectiveSort.length && input.viewId) {
        joins.push(Prisma.sql`
          LEFT JOIN "ViewRowOrder" vro
            ON vro."rowId" = tr.id AND vro."viewId" = ${input.viewId}
        `);
        orderParts.push(Prisma.sql`(vro."position" IS NULL) ASC`);
        orderParts.push(Prisma.sql`vro."position" ASC NULLS LAST`);
      }
      effectiveSort.forEach((s, idx) => {
        const alias = Prisma.raw(`s${idx}`);
        joins.push(Prisma.sql`
          LEFT JOIN "TableCell" ${alias}
            ON ${alias}."rowId" = tr.id AND ${alias}."columnId" = ${s.columnId}
        `);
        const dir = Prisma.raw(s.direction.toUpperCase());
        
        // Check if this is a number column
        const column = table.columns.find(col => col.id === s.columnId);
        const isNumberColumn = column?.type === 'number';
        
        if (isNumberColumn) {
          // For number columns, treat empty cells as less than 0
          const numExpr = Prisma.sql`NULLIF(regexp_replace(COALESCE(${alias}.value, ''), '[^0-9\\.\\-]', '', 'g'), '')`;
          const isNum = Prisma.sql`(COALESCE(${numExpr}, '') ~ '^-?\\d+(\\.\\d+)?$')`;
          const safeNum = Prisma.sql`CASE WHEN ${isNum} THEN (${numExpr})::numeric ELSE -1 END`;
          orderParts.push(Prisma.sql`${safeNum} ${dir}`);
        } else {
          // For text columns, use the original logic
          const numExpr = Prisma.sql`NULLIF(regexp_replace(COALESCE(${alias}.value, ''), '[^0-9\\.\\-]', '', 'g'), '')`;
          const isNum = Prisma.sql`(COALESCE(${numExpr}, '') ~ '^-?\\d+(\\.\\d+)?$')`;
          const safeNum = Prisma.sql`CASE WHEN ${isNum} THEN (${numExpr})::numeric ELSE NULL END`;
          orderParts.push(Prisma.sql`${isNum} DESC`);
          orderParts.push(Prisma.sql`${safeNum} ${dir} NULLS LAST`);
          orderParts.push(Prisma.sql`LOWER(COALESCE(${alias}.value, '')) ${dir}`);
        }
      });
      orderParts.push(Prisma.sql`tr.order ASC`);
      // Ensure globally stable ordering across pages (unique final tiebreaker)
      orderParts.push(Prisma.sql`tr.id ASC`);

      const joinsSql = joins.length > 0 ? Prisma.join(joins, ' ') : Prisma.sql``;
      const whereSql = whereParts.length > 0 ? Prisma.join(whereParts, ' AND ') : Prisma.sql`TRUE`;
      const countRows = await ctx.db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "TableRow" tr
        ${joinsSql}
        WHERE ${whereSql}
      `);
      const totalRows = Number(countRows[0]?.count ?? 0);

      const offset = input.page * input.pageSize;
      const limit = input.pageSize;
      const idWindow = await ctx.db.$queryRaw<Array<{ id: string; order: number }>>(Prisma.sql`
        SELECT tr.id, tr.order
        FROM "TableRow" tr
        ${joinsSql}
        WHERE ${whereSql}
        ORDER BY ${Prisma.join(orderParts, ', ')}
        OFFSET ${Prisma.raw(String(offset))} LIMIT ${Prisma.raw(String(limit))}
      `);

      if (idWindow.length === 0) {
        return {
          table,
          rows: [],
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            totalRows,
            totalPages: Math.ceil(totalRows / input.pageSize),
            hasNextPage: false,
            hasPreviousPage: input.page > 0
          }
        };
      }

      const rows = await ctx.db.tableRow.findMany({
        where: { id: { in: idWindow.map(r => r.id) } },
        include: { cells: { include: { column: true } } }
      });
      const orderMap = new Map(idWindow.map((r, i) => [r.id, i]));
      rows.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

      return {
        table,
        rows,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          totalRows,
          totalPages: Math.ceil(totalRows / input.pageSize),
          hasNextPage: (input.page + 1) * input.pageSize < totalRows,
          hasPreviousPage: input.page > 0
        }
      };
    }),

  // New search endpoint that searches across all rows
  searchPaginated: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      query: z.string().min(1), // Changed from searchTerm to query
      offset: z.number().min(0).default(0),
      limit: z.number().min(1).max(200).default(100), // Cap at 200 for performance
      sortRules: z.array(z.object({
        columnId: z.string(),
        direction: z.enum(["asc", "desc"])
      })).optional(),
      filterRules: z.array(z.object({
        columnId: z.string(),
        operator: z.string(),
        value: z.string()
      })).optional()
    }))
    .query(async ({ ctx, input }) => {
      // Set a timeout to prevent long-running searches
      await ctx.db.$executeRaw`SET LOCAL statement_timeout = '3000ms'`;

      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            createdById: ctx.session.user.id
          }
        },
        include: {
          columns: {
            orderBy: { order: "asc" }
          }
        }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      const searchLower = input.query.toLowerCase();

      // First, find all row IDs that contain matches (for total count and navigation)
      // Use a more efficient approach for large tables
      const matchingRowIds = await ctx.db.$queryRaw<Array<{ rowId: string; order: number }>>`
        SELECT DISTINCT tr.id as "rowId", tr.order
        FROM "TableRow" tr
        JOIN "TableCell" tc ON tr.id = tc."rowId"
        JOIN "TableColumn" tcol ON tc."columnId" = tcol.id
        WHERE tr."tableId" = ${input.tableId}
        AND (
          LOWER(tc.value) LIKE ${`%${searchLower}%`}
          OR LOWER(tcol.name) LIKE ${`%${searchLower}%`}
        )
        ORDER BY tr.order ASC
        LIMIT 1000
      `;

      const totalMatches = matchingRowIds.length;

      // Get the specific window of matching rows using offset/limit
      const windowStart = input.offset;
      const windowEnd = input.offset + input.limit;
      const windowRowIds = matchingRowIds.slice(windowStart, windowEnd);

      if (windowRowIds.length === 0) {
        return {
          table,
          rows: [],
          totalMatches,
          matchRowIds: matchingRowIds.map(r => ({ id: r.rowId, order: r.order })),
          pagination: {
            offset: input.offset,
            limit: input.limit,
            totalMatches,
            hasMore: windowEnd < totalMatches,
            nextOffset: windowEnd < totalMatches ? windowEnd : undefined
          }
        };
      }

      // Fetch the actual row data for the current window
      const rows = await ctx.db.tableRow.findMany({
        where: {
          id: { in: windowRowIds.map(r => r.rowId) }
        },
        orderBy: { order: "asc" },
        include: {
          cells: {
            include: {
              column: true
            }
          }
        }
      });

      // Sort rows by the order they appeared in the search results
      const rowOrderMap = new Map(windowRowIds.map((r, index) => [r.rowId, index]));
      rows.sort((a, b) => (rowOrderMap.get(a.id) ?? 0) - (rowOrderMap.get(b.id) ?? 0));

      return {
        table,
        rows,
        totalMatches,
        matchRowIds: matchingRowIds.map(r => ({ id: r.rowId, order: r.order })),
        pagination: {
          offset: input.offset,
          limit: input.limit,
          totalMatches,
          hasMore: windowEnd < totalMatches,
          nextOffset: windowEnd < totalMatches ? windowEnd : undefined
        }
      };
    }),

  // Delete table mutation
  deleteTable: protectedProcedure
    .input(z.object({ 
      tableId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            createdById: ctx.session.user.id
          }
        }
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have permission to delete it"
        });
      }

      // Check if this is the last table in the base
      const tableCount = await ctx.db.table.count({
        where: {
          baseId: table.baseId
        }
      });

      if (tableCount <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the last remaining table in the base"
        });
      }

      // Delete the table (cascade will handle related data)
      await ctx.db.table.delete({
        where: { id: input.tableId }
      });

      return { success: true };
    }),

  // Rename table mutation
  renameTable: protectedProcedure
    .input(z.object({ 
      tableId: z.string(),
      newName: z.string().min(1).max(100)
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            createdById: ctx.session.user.id
          }
        }
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or you don't have permission to rename it"
        });
      }

      // Update the table name
      const updatedTable = await ctx.db.table.update({
        where: { id: input.tableId },
        data: { name: input.newName }
      });

      return { success: true, table: updatedTable };
    })
}); 