// src/controllers/databaseController.js
// Database Tool Controller - Handles CRUD operations on Firestore

const { firestoreAdmin, isFirestoreReady } = require('../lib/firebase/firebase');

// Collection name for our database
const COLLECTION_NAME = 'data_records';

const normalizeEntity = (entity) => {
  if (!entity) return null;
  let normalized = entity.toLowerCase().trim();
  if (normalized.endsWith('y')) {
    return normalized.slice(0, -1) + 'ies'; // e.g. company -> companies (simple heuristic)
  }
  if (!normalized.endsWith('s')) {
    normalized += 's';
  }
  return normalized;
};

/**
 * Add a new record to the database
 * @param {string} entity - Entity type (e.g., 'employees', 'orders', 'products')
 * @param {Object} data - Data to add
 * @returns {Promise<string>} - Human-readable response
 */
const addRecord = async (entity, data) => {
  try {
    if (!isFirestoreReady()) {
      throw new Error('Firestore is not properly initialized. Please check your Firebase Admin credentials in .env.local file.');
    }

    const normalizedEntity = normalizeEntity(entity);
    // Check if data is empty or insufficient
    if (!data || Object.keys(data).length === 0) {
      const entityName = normalizedEntity || 'record';
      throw new Error(`To add a new ${entityName}, I need more details. Please provide the information you want to add (e.g., name, amount, description, etc.).`);
    }

    const docRef = await firestoreAdmin.collection(COLLECTION_NAME).add({
      entity: normalizedEntity,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const entityName = entity || 'record';
    return `Successfully added a new ${entityName} to the database.`;
  } catch (error) {
    console.error('Error adding record:', error);

    // Handle authentication errors
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED') || error.message?.includes('invalid authentication credentials')) {
      throw new Error('Firebase authentication failed. Please verify your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in .env.local are correct.');
    }

    throw new Error(`Failed to add record: ${error.message}`);
  }
};

/**
 * Modify/Update an existing record
 * @param {string} entity - Entity type
 * @param {Object} filters - Filters to find the record
 * @param {Object} updateData - Data to update
 * @returns {Promise<string>} - Human-readable response
 */
const modifyRecord = async (entity, filters, updateData) => {
  try {
    if (!isFirestoreReady()) {
      throw new Error('Firestore is not properly initialized. Please check your Firebase Admin credentials in .env.local file.');
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return 'No update data provided. Please specify what to update.';
    }

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    if (entity) {
      query = query.where('entity', '==', normalizeEntity(entity));
    }

    // Apply additional filters (limit to avoid composite index issues)
    const filterKeys = filters ? Object.keys(filters).filter(key => key !== 'entity') : [];
    if (filterKeys.length > 0) {
      // Apply first filter (most queries work with entity + one more filter)
      const firstKey = filterKeys[0];
      query = query.where(firstKey, '==', filters[firstKey]);

      // Note: Firestore requires composite indexes for multiple where clauses
      // For now, we'll use the first filter. In production, you'd create composite indexes.
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return `No ${entity || 'records'} found matching the criteria.`;
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      ...updateData,
      updatedAt: new Date(),
    });

    return `Successfully updated the ${entity || 'record'}.`;
  } catch (error) {
    console.error('Error modifying record:', error);

    // Handle authentication errors
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED') || error.message?.includes('invalid authentication credentials')) {
      throw new Error('Firebase authentication failed. Please verify your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in .env.local are correct.');
    }

    // Handle Firestore index errors gracefully
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index. Please create the required index in Firestore.');
    }
    throw new Error(`Failed to modify record: ${error.message}`);
  }
};

/**
 * Delete a record
 * @param {string} entity - Entity type
 * @param {Object} filters - Filters to find the record
 * @returns {Promise<string>} - Human-readable response
 */
const deleteRecord = async (entity, filters) => {
  try {
    if (!isFirestoreReady()) {
      throw new Error('Firestore is not properly initialized. Please check your Firebase Admin credentials in .env.local file.');
    }

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    if (entity) {
      query = query.where('entity', '==', normalizeEntity(entity));
    }

    // Apply additional filters (limit to avoid composite index issues)
    const filterKeys = filters ? Object.keys(filters).filter(key => key !== 'entity') : [];
    if (filterKeys.length > 0) {
      // Apply first filter (most queries work with entity + one more filter)
      const firstKey = filterKeys[0];
      query = query.where(firstKey, '==', filters[firstKey]);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return `No ${entity || 'records'} found matching the criteria.`;
    }

    const doc = snapshot.docs[0];
    await doc.ref.delete();

    return `Successfully deleted the ${entity || 'record'}.`;
  } catch (error) {
    console.error('Error deleting record:', error);

    // Handle authentication errors
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED') || error.message?.includes('invalid authentication credentials')) {
      throw new Error('Firebase authentication failed. Please verify your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in .env.local are correct.');
    }

    // Handle Firestore index errors gracefully
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index. Please create the required index in Firestore.');
    }
    throw new Error(`Failed to delete record: ${error.message}`);
  }
};

/**
 * Display/List records
 * @param {string} entity - Entity type
 * @param {Object} filters - Filters to apply
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<string>} - Human-readable response
 */
const displayRecords = async (entity, filters, limit = 10) => {
  try {
    if (!isFirestoreReady()) {
      // Run diagnostic check
      const config = checkFirebaseConfig();
      throw new Error(`Firestore is not properly initialized. Configuration check: ${JSON.stringify(config)}. Please verify FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env file`);
    }

    // Log the operation for debugging
    console.log(`🔍 Firestore operation: displayRecords for entity="${entity}"`);
    console.log(`   Collection: ${COLLECTION_NAME}`);
    console.log(`   Firestore instance: ${firestoreAdmin ? 'exists' : 'null'}`);

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    if (entity) {
      query = query.where('entity', '==', normalizeEntity(entity));
    }

    // Apply filters
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (key !== 'entity') {
          // Handle range queries for numeric fields
          if (key.toLowerCase().includes('min') || key.toLowerCase().includes('max')) {
            const fieldName = key.replace(/min|max/gi, '').toLowerCase();
            const value = filters[key];
            if (key.toLowerCase().includes('min')) {
              query = query.where(fieldName, '>=', value);
            } else {
              query = query.where(fieldName, '<=', value);
            }
          } else if (key === 'joinedLastMonth' || key === 'lastMonth') {
            // Handle date-based filters
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            query = query.where('joinDate', '>=', lastMonth);
          } else if (key === 'minAmount' && entity === 'orders') {
            // Special handling for order amount filters
            query = query.where('amount', '>=', filters[key]);
          } else if (key === 'maxAmount' && entity === 'orders') {
            query = query.where('amount', '<=', filters[key]);
          } else {
            query = query.where(key, '==', filters[key]);
          }
        }
      });
    }

    const snapshot = await query.limit(limit).get();

    if (snapshot.empty) {
      return `No ${entity || 'records'} found matching the criteria.`;
    }

    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const count = records.length;
    const entityName = entity || 'records';
    const singularName = entityName.endsWith('s') ? entityName.slice(0, -1) : entityName;

    // Generate human-readable summary with more details
    if (count === 0) {
      return `No ${entityName} found matching your criteria.`;
    } else if (count === 1) {
      const record = records[0];
      if (entity === 'orders' && record.amount) {
        return `Found 1 order: ${record.orderId || 'Order'} for $${record.amount.toFixed(2)}.`;
      } else if (entity === 'employees' && record.name) {
        return `Found 1 employee: ${record.name} from the ${record.department || 'company'} department.`;
      }
      return `Found 1 ${singularName} matching your criteria.`;
    } else {
      // Provide summary statistics if available
      if (entity === 'orders' && records.some(r => r.amount)) {
        const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);
        return `Found ${count} orders with a total value of $${totalAmount.toFixed(2)}.`;
      } else if (entity === 'employees') {
        const departments = [...new Set(records.map(r => r.department).filter(Boolean))];
        if (departments.length > 0) {
          return `Found ${count} employees across ${departments.length} department${departments.length > 1 ? 's' : ''}: ${departments.join(', ')}.`;
        }
      }
      return `Found ${count} ${entityName} matching your criteria.`;
    }
  } catch (error) {
    console.error('❌ Error displaying records:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error details:', error.details);

    // Handle authentication errors with detailed guidance
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED') || error.message?.includes('invalid authentication credentials')) {
      console.error('🔍 Authentication Error - Possible causes:');
      console.error('   1. Service account key is for a different Firebase project');
      console.error('   2. Service account was deleted or disabled in Firebase Console');
      console.error('   3. Firestore API is not enabled for this project');
      console.error('   4. Service account lacks Firestore permissions');
      console.error('   5. FIREBASE_PROJECT_ID in .env does not match the service account project');
      console.error('');
      console.error('📋 To fix this:');
      console.error('   1. Go to Firebase Console → Project Settings → Service Accounts');
      console.error('   2. Verify the service account email matches FIREBASE_CLIENT_EMAIL in .env');
      console.error('   3. Ensure the service account has "Cloud Datastore User" or "Firebase Admin" role');
      console.error('   4. Go to Firebase Console → Firestore Database → ensure it\'s enabled');
      console.error('   5. Verify FIREBASE_PROJECT_ID matches your Firebase project ID');
      console.error('   6. Generate a new service account key if needed');
      throw new Error('Firebase authentication failed. The service account credentials may be invalid, expired, or lack Firestore permissions. Check the console logs above for detailed troubleshooting steps.');
    }

    // Handle Firestore index errors gracefully
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index. Please create the required index in Firestore.');
    }
    throw new Error(`Failed to display records: ${error.message}`);
  }
};

/**
 * Count records
 * @param {string} entity - Entity type
 * @param {Object} filters - Filters to apply
 * @returns {Promise<string>} - Human-readable response
 */
const countRecords = async (entity, filters) => {
  try {
    if (!isFirestoreReady()) {
      throw new Error('Firestore is not properly initialized. Please check your Firebase Admin credentials in .env.local file.');
    }

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    if (entity) {
      query = query.where('entity', '==', normalizeEntity(entity));
    }

    // Apply filters
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (key !== 'entity') {
          // Handle date-based filters
          if (key === 'joinedLastMonth' || key === 'lastMonth') {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            query = query.where('joinDate', '>=', lastMonth);
          } else {
            query = query.where(key, '==', filters[key]);
          }
        }
      });
    }

    const snapshot = await query.get();
    const count = snapshot.size;
    const entityName = entity || 'records';

    if (count === 0) {
      return `There are no ${entityName} matching your criteria.`;
    } else if (count === 1) {
      return `There is 1 ${entityName.slice(0, -1)} matching your criteria.`;
    } else {
      return `There are ${count} ${entityName} matching your criteria.`;
    }
  } catch (error) {
    console.error('Error counting records:', error);

    // Handle authentication errors
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED') || error.message?.includes('invalid authentication credentials')) {
      throw new Error('Firebase authentication failed. Please verify your FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in .env.local are correct.');
    }

    // Handle Firestore index errors gracefully
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index. Please create the required index in Firestore.');
    }
    throw new Error(`Failed to count records: ${error.message}`);
  }
};

/**
 * Main database handler that routes to appropriate CRUD operation
 * @param {string} action - Action to perform (add, modify, delete, display, count, list)
 * @param {string} entity - Entity type
 * @param {Object} parameters - Parameters including filters and data
 * @returns {Promise<string>} - Human-readable response
 */
const handleDatabaseOperation = async (action, entity, parameters) => {
  const { filters = {}, data = {} } = parameters || {};

  switch (action.toLowerCase()) {
    case 'add':
    case 'create':
      return await addRecord(entity, data);

    case 'modify':
    case 'update':
    case 'edit':
      return await modifyRecord(entity, filters, data);

    case 'delete':
    case 'remove':
      return await deleteRecord(entity, filters);

    case 'display':
    case 'list':
    case 'show':
      return await displayRecords(entity, filters);

    case 'count':
      return await countRecords(entity, filters);

    default:
      // Default to display if action is unclear
      return await displayRecords(entity, filters);
  }
};

module.exports = {
  handleDatabaseOperation,
  addRecord,
  modifyRecord,
  deleteRecord,
  displayRecords,
  countRecords,
};

