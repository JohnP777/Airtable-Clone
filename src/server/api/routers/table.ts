import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { faker } from '@faker-js/faker';

// Configuration for bulk operations
const BULK_OPERATION_CONFIG = {
  // Adjust batch size based on database performance
  // PostgreSQL can handle larger batches efficiently
  BATCH_SIZE: 2500,
  // Maximum concurrent batches to avoid overwhelming the database
  MAX_CONCURRENT_BATCHES: 4,
  // Progress update interval in milliseconds
  PROGRESS_UPDATE_INTERVAL: 100,
  // Enable database-specific optimizations
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
            const cellValue = cell?.value ?? "";
            
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
            
            const aValue = aCell?.value ?? "";
            const bValue = bCell?.value ?? "";
            
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
    }),

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

  // Ultra-fast bulk row addition using optimized batching
  addBulkRowsFast: protectedProcedure
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

      // Find the next available order number to ensure proper sequencing
      const maxOrderRow = await ctx.db.tableRow.findFirst({
        where: { tableId: input.tableId },
        orderBy: { order: "desc" },
        select: { order: true }
      });
      
      const startOrder = (maxOrderRow?.order ?? -1) + 1;

      // Generate fake data for existing columns
      const fakeData = generateFakeDataForColumns(table.columns, input.rowCount);

      // Use much larger batches and concurrent processing for maximum performance
      const batchSize = BULK_OPERATION_CONFIG.BATCH_SIZE;
      const totalBatches = Math.ceil(input.rowCount / batchSize);
      let totalCreatedRows = 0;

      // Process batches with controlled concurrency to avoid overwhelming the database
      const processBatch = async (batchIndex: number) => {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, input.rowCount);
        const batch = fakeData.slice(startIndex, endIndex);
        
        // Use a transaction for each batch to ensure atomicity
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
            await tx.tableCell.createMany({
              data: batchCellData,
              skipDuplicates: true
            });
          }

          return batch.length;
        });
      };

      // Process batches with controlled concurrency
      const batchPromises = [];
      for (let i = 0; i < totalBatches; i += BULK_OPERATION_CONFIG.MAX_CONCURRENT_BATCHES) {
        const concurrentBatch = [];
        for (let j = 0; j < BULK_OPERATION_CONFIG.MAX_CONCURRENT_BATCHES && i + j < totalBatches; j++) {
          concurrentBatch.push(processBatch(i + j));
        }
        
        // Wait for current concurrent batch to complete before starting next
        const batchResults = await Promise.all(concurrentBatch);
        totalCreatedRows += batchResults.reduce((sum, count) => sum + count, 0);
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
      page: z.number().min(0).default(0),
      pageSize: z.number().min(1).max(100).default(50),
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
          }
        }
      });

      if (!table) {
        throw new Error("Table not found");
      }

      // Get total count for pagination
      const totalRows = await ctx.db.tableRow.count({
        where: { tableId: input.tableId }
      });

      // Get paginated rows with cells
      const rows = await ctx.db.tableRow.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
        skip: input.page * input.pageSize,
        take: input.pageSize,
        include: {
          cells: {
            include: {
              column: true
            }
          }
        }
      });

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
    })
}); 