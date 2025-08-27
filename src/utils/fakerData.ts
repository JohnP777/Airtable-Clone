import { faker } from '@faker-js/faker';

// Common business table column types with realistic data
export const DEFAULT_COLUMNS = [
  { name: 'Name', type: 'text', generator: () => faker.person.fullName() },
  { name: 'Email', type: 'text', generator: () => faker.internet.email() },
  { name: 'Company', type: 'text', generator: () => faker.company.name() },
  { name: 'Phone', type: 'text', generator: () => faker.phone.number() },
  { name: 'Address', type: 'text', generator: () => faker.location.streetAddress() },
  { name: 'City', type: 'text', generator: () => faker.location.city() },
  { name: 'State', type: 'text', generator: () => faker.location.state() },
  { name: 'Zip Code', type: 'text', generator: () => faker.location.zipCode() },
  { name: 'Job Title', type: 'text', generator: () => faker.person.jobTitle() },
  { name: 'Department', type: 'text', generator: () => faker.commerce.department() },
  { name: 'Salary', type: 'text', generator: () => `$${faker.number.int({ min: 30000, max: 150000 }).toLocaleString()}` },
  { name: 'Start Date', type: 'text', generator: () => faker.date.past({ years: 5 }).toLocaleDateString() },
  { name: 'Status', type: 'text', generator: () => faker.helpers.arrayElement(['Active', 'Inactive', 'Pending', 'Terminated']) },
  { name: 'Notes', type: 'text', generator: () => faker.lorem.sentence() },
  { name: 'Priority', type: 'text', generator: () => faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']) },
  { name: 'Category', type: 'text', generator: () => faker.helpers.arrayElement(['Sales', 'Marketing', 'Engineering', 'HR', 'Finance', 'Operations']) },
  { name: 'Budget', type: 'text', generator: () => `$${faker.number.int({ min: 1000, max: 50000 }).toLocaleString()}` },
  { name: 'Progress', type: 'text', generator: () => `${faker.number.int({ min: 0, max: 100 })}%` },
  { name: 'Manager', type: 'text', generator: () => faker.person.fullName() },
  { name: 'Team Size', type: 'text', generator: () => faker.number.int({ min: 1, max: 20 }).toString() }
];

// Generate a random subset of columns for variety
export function getRandomColumns(count = 8) {
  const shuffled = faker.helpers.shuffle([...DEFAULT_COLUMNS]);
  return shuffled.slice(0, Math.min(count, DEFAULT_COLUMNS.length));
}

// Generate sample data for a row based on columns
export function generateRowData(columns: typeof DEFAULT_COLUMNS) {
  const rowData: Record<string, string> = {};
  
  columns.forEach(column => {
    rowData[column.name] = column.generator();
  });
  
  return rowData;
}

// Generate multiple rows of sample data
export function generateSampleRows(columns: typeof DEFAULT_COLUMNS, rowCount = 10) {
  const rows = [];
  
  for (let i = 0; i < rowCount; i++) {
    rows.push(generateRowData(columns));
  }
  
  return rows;
}

// Alternative column sets for different use cases
export const SALES_COLUMNS = [
  { name: 'Lead Name', type: 'text', generator: () => faker.person.fullName() },
  { name: 'Company', type: 'text', generator: () => faker.company.name() },
  { name: 'Email', type: 'text', generator: () => faker.internet.email() },
  { name: 'Phone', type: 'text', generator: () => faker.phone.number() },
  { name: 'Lead Source', type: 'text', generator: () => faker.helpers.arrayElement(['Website', 'Referral', 'Cold Call', 'Trade Show', 'Social Media']) },
  { name: 'Value', type: 'text', generator: () => `$${faker.number.int({ min: 1000, max: 100000 }).toLocaleString()}` },
  { name: 'Stage', type: 'text', generator: () => faker.helpers.arrayElement(['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']) },
  { name: 'Expected Close', type: 'text', generator: () => faker.date.future({ years: 1 }).toLocaleDateString() },
  { name: 'Owner', type: 'text', generator: () => faker.person.fullName() },
  { name: 'Notes', type: 'text', generator: () => faker.lorem.sentence() }
];

export const INVENTORY_COLUMNS = [
  { name: 'Product Name', type: 'text', generator: () => faker.commerce.productName() },
  { name: 'SKU', type: 'text', generator: () => faker.string.alphanumeric(8).toUpperCase() },
  { name: 'Category', type: 'text', generator: () => faker.commerce.department() },
  { name: 'Price', type: 'text', generator: () => faker.commerce.price() },
  { name: 'Cost', type: 'text', generator: () => faker.commerce.price({ min: 10, max: 100 }) },
  { name: 'Quantity', type: 'text', generator: () => faker.number.int({ min: 0, max: 1000 }).toString() },
  { name: 'Supplier', type: 'text', generator: () => faker.company.name() },
  { name: 'Location', type: 'text', generator: () => faker.helpers.arrayElement(['Warehouse A', 'Warehouse B', 'Store Front', 'Online']) },
  { name: 'Last Updated', type: 'text', generator: () => faker.date.recent().toLocaleDateString() },
  { name: 'Status', type: 'text', generator: () => faker.helpers.arrayElement(['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued']) }
];

export const PROJECT_COLUMNS = [
  { name: 'Project Name', type: 'text', generator: () => faker.company.catchPhrase() },
  { name: 'Client', type: 'text', generator: () => faker.company.name() },
  { name: 'Project Manager', type: 'text', generator: () => faker.person.fullName() },
  { name: 'Start Date', type: 'text', generator: () => faker.date.past({ years: 1 }).toLocaleDateString() },
  { name: 'End Date', type: 'text', generator: () => faker.date.future({ years: 2 }).toLocaleDateString() },
  { name: 'Budget', type: 'text', generator: () => `$${faker.number.int({ min: 10000, max: 500000 }).toLocaleString()}` },
  { name: 'Progress', type: 'text', generator: () => `${faker.number.int({ min: 0, max: 100 })}%` },
  { name: 'Status', type: 'text', generator: () => faker.helpers.arrayElement(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']) },
  { name: 'Priority', type: 'text', generator: () => faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']) },
  { name: 'Description', type: 'text', generator: () => faker.lorem.sentence() }
];

// Get a specific column set by name
export function getColumnSet(setName: 'default' | 'sales' | 'inventory' | 'project' = 'default') {
  switch (setName) {
    case 'sales':
      return SALES_COLUMNS;
    case 'inventory':
      return INVENTORY_COLUMNS;
    case 'project':
      return PROJECT_COLUMNS;
    default:
      return DEFAULT_COLUMNS;
  }
}
