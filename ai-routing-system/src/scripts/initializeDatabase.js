// src/scripts/initializeDatabase.js
// Script to initialize Firestore with sample data
require('dotenv').config();

const { firestoreAdmin } = require('../lib/firebase/firebase');

const COLLECTION_NAME = 'data_records';

const sampleData = [
  {
    entity: 'employees',
    name: 'John Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    salary: 75000,
    joinDate: new Date('2024-01-15'),
    status: 'active',
  },
  {
    entity: 'employees',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    department: 'Marketing',
    salary: 65000,
    joinDate: new Date('2024-02-20'),
    status: 'active',
  },
  {
    entity: 'employees',
    name: 'Bob Johnson',
    email: 'bob.johnson@company.com',
    department: 'Sales',
    salary: 70000,
    joinDate: new Date('2023-11-10'),
    status: 'active',
  },
  {
    entity: 'orders',
    orderId: 'ORD-001',
    customerName: 'Alice Brown',
    amount: 1250.50,
    status: 'completed',
    orderDate: new Date('2024-11-15'),
    items: ['Product A', 'Product B'],
  },
  {
    entity: 'orders',
    orderId: 'ORD-002',
    customerName: 'Charlie Wilson',
    amount: 850.00,
    status: 'pending',
    orderDate: new Date('2024-11-20'),
    items: ['Product C'],
  },
  {
    entity: 'orders',
    orderId: 'ORD-003',
    customerName: 'Diana Martinez',
    amount: 3200.75,
    status: 'completed',
    orderDate: new Date('2024-10-05'),
    items: ['Product A', 'Product D', 'Product E'],
  },
  {
    entity: 'products',
    productId: 'PROD-001',
    name: 'Laptop Computer',
    category: 'Electronics',
    price: 1299.99,
    stock: 45,
    supplier: 'TechCorp',
  },
  {
    entity: 'products',
    productId: 'PROD-002',
    name: 'Office Chair',
    category: 'Furniture',
    price: 299.99,
    stock: 120,
    supplier: 'FurniturePlus',
  },
];

async function initializeDatabase() {
  try {
    if (!firestoreAdmin) {
      console.error('Firestore not initialized. Check your Firebase configuration.');
      process.exit(1);
    }

    console.log('Initializing database with sample data...');

    const batch = firestoreAdmin.batch();
    let count = 0;

    for (const data of sampleData) {
      const docRef = firestoreAdmin.collection(COLLECTION_NAME).doc();
      const record = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      batch.set(docRef, record);
      count++;
    }

    await batch.commit();
    console.log(`Successfully added ${count} records to the database.`);
    console.log('Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };

