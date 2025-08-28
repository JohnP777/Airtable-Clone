import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { faker } from '@faker-js/faker';

// Function to generate fake data for business columns
function generateFakeBusinessData() {
  return {
    columns: [
      { name: "Employee Name", order: 0 },
      { name: "Department", order: 1 },
      { name: "Email", order: 2 },
      { name: "Salary", order: 3 },
      { name: "Start Date", order: 4 }
    ],
    rows: Array.from({ length: 100 }, (_, index) => ({
      order: index,
      cells: [
        { value: faker.person.fullName() },
        { value: faker.helpers.arrayElement(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Product']) },
        { value: faker.internet.email() },
        { value: `$${faker.number.int({ min: 45000, max: 180000 }).toLocaleString()}` },
        { value: faker.date.past({ years: 3 }).toLocaleDateString() }
      ]
    }))
  };
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
        value: z.string()
      })).optional()
    }))
    .query(async ({ ctx, input }) => {
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
        filteredRows = filteredRows.filter(row => {
          return input.filterRules!.every(filterRule => {
            const cell = row.cells.find(cell => cell.columnId === filterRule.columnId);
            const cellValue = cell?.value || "";
            
            switch (filterRule.operator) {
              case "contains":
                return cellValue.toLowerCase().includes(filterRule.value.toLowerCase());
              case "does not contain":
                return !cellValue.toLowerCase().includes(filterRule.value.toLowerCase());
              case "is":
                return cellValue.toLowerCase() === filterRule.value.toLowerCase();
              case "is not":
                return cellValue.toLowerCase() !== filterRule.value.toLowerCase();
              case "is empty":
                return cellValue === "" || cellValue === null || cellValue === undefined;
              case "is not empty":
                return cellValue !== "" && cellValue !== null && cellValue !== undefined;
              default:
                return true;
            }
          });
        });
      }

      // Apply sorting if sort rules are provided
      if (input.sortRules && input.sortRules.length > 0) {
        const sortedRows = [...filteredRows].sort((a, b) => {
          // Apply each sort rule in order (hierarchy)
          for (const sortRule of input.sortRules!) {
            const aCell = a.cells.find(cell => cell.columnId === sortRule.columnId);
            const bCell = b.cells.find(cell => cell.columnId === sortRule.columnId);
            
            const aValue = aCell?.value || "";
            const bValue = bCell?.value || "";
            
            // Handle numeric values (remove $ and commas for salary)
            const aNumeric = parseFloat(aValue.replace(/[$,]/g, ""));
            const bNumeric = parseFloat(bValue.replace(/[$,]/g, ""));
            
            if (!isNaN(aNumeric) && !isNaN(bNumeric)) {
              // Numeric comparison
              if (aNumeric !== bNumeric) {
                return sortRule.direction === "asc" ? aNumeric - bNumeric : bNumeric - aNumeric;
              }
            } else {
              // String comparison
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
      sortRules: z.array(z.object({
        columnId: z.string(),
        direction: z.enum(["asc", "desc"])
      }))
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

      // For now, we'll just return success since the sorting is applied in the query
      // In a real implementation, you might want to store the sort rules in the database
      // associated with the current view
      return { 
        success: true, 
        sortRules: input.sortRules,
        message: "Sort rules applied successfully"
      };
    }),

  createTable: protectedProcedure
    .input(z.object({ baseId: z.string() }))
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
          name: `Table ${tableCount + 1}`,
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

      const rowCount = await ctx.db.tableRow.count({ 
        where: { tableId: input.tableId } 
      });

      const row = await ctx.db.tableRow.create({
        data: {
          tableId: input.tableId,
          order: rowCount
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
      name: z.string().optional() // Optional custom name
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

  populateCellsWithData: protectedProcedure
    .input(z.object({ 
      tableId: z.string(),
      cellData: z.array(z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string()
      }))
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

      // Update multiple cells with the provided data
      const updatePromises = input.cellData.map(cell => 
        ctx.db.tableCell.upsert({
          where: {
            tableId_rowId_columnId: {
              tableId: input.tableId,
              rowId: cell.rowId,
              columnId: cell.columnId
            }
          },
          update: {
            value: cell.value
          },
          create: {
            tableId: input.tableId,
            rowId: cell.rowId,
            columnId: cell.columnId,
            value: cell.value
          }
        })
      );

      await Promise.all(updatePromises);

      return { success: true, updatedCells: input.cellData.length };
    })
}); 