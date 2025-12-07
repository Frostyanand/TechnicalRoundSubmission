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

// ... (imports remain)



/**
 * Add a new record
 * Returns { message: string, data: Array }
 */
const addRecord = async (entity, data) => {
  try {
    if (!isFirestoreReady()) {
      throw new Error('Firestore is not properly initialized.');
    }

    const normalizedEntity = normalizeEntity(entity);
    if (!data || Object.keys(data).length === 0) {
      const entityName = normalizedEntity || 'record';
      throw new Error(`To add a new ${entityName}, I need more details.`);
    }

    const docRef = await firestoreAdmin.collection(COLLECTION_NAME).add({
      entity: normalizedEntity,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const entityName = entity || 'record';
    return {
      message: `Successfully added a new ${entityName} to the database.`,
      data: [{ id: docRef.id, ...data, entity: normalizedEntity }]
    };
  } catch (error) {
    console.error('Error adding record:', error);
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      throw new Error('Firebase authentication failed.');
    }
    throw new Error(`Failed to add record: ${error.message}`);
  }
};

/**
 * Modify an existing record
 * Returns { message: string, data: Array }
 */
const modifyRecord = async (entity, filters, updateData) => {
  try {
    if (!isFirestoreReady()) throw new Error('Firestore is not properly initialized.');

    if (!updateData || Object.keys(updateData).length === 0) {
      return { message: 'No update data provided.', data: null };
    }

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    // Treat 'records', 'database', 'all' as WILDCARDS (no filter)
    const genericEntities = ['records', 'record', 'database', 'databases', 'all', 'everything', 'data'];
    const normalized = normalizeEntity(entity);
    const isGeneric = !entity || genericEntities.includes(normalized) || genericEntities.includes(entity?.toLowerCase());

    if (entity && !isGeneric) {
      query = query.where('entity', '==', normalized);
    }

    const filterKeys = filters ? Object.keys(filters).filter(key => key !== 'entity') : [];
    if (filterKeys.length > 0) {
      const firstKey = filterKeys[0];
      query = query.where(firstKey, '==', filters[firstKey]);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return { message: `No ${entity || 'records'} found matching criteria.`, data: null };
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      ...updateData,
      updatedAt: new Date(),
    });

    return {
      message: `Successfully updated the ${entity || 'record'}.`,
      data: [{ id: doc.id, ...doc.data(), ...updateData }]
    };
  } catch (error) {
    console.error('Error modifying record:', error);
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      throw new Error('Firebase authentication failed.');
    }
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index.');
    }
    throw new Error(`Failed to modify record: ${error.message}`);
  }
};

/**
 * Delete a record
 * Returns { message: string, data: null }
 */
const deleteRecord = async (entity, filters) => {
  try {
    if (!isFirestoreReady()) throw new Error('Firestore is not properly initialized.');

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    // Treat 'records', 'database', 'all' as WILDCARDS (no filter)
    const genericEntities = ['records', 'record', 'database', 'databases', 'all', 'everything', 'data'];
    const normalized = normalizeEntity(entity);
    const isGeneric = !entity || genericEntities.includes(normalized) || genericEntities.includes(entity?.toLowerCase());

    if (entity && !isGeneric) {
      query = query.where('entity', '==', normalized);
    }

    const filterKeys = filters ? Object.keys(filters).filter(key => key !== 'entity') : [];
    if (filterKeys.length > 0) {
      const firstKey = filterKeys[0];
      query = query.where(firstKey, '==', filters[firstKey]);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return { message: `No ${entity || 'records'} found matching criteria.`, data: null };
    }

    const doc = snapshot.docs[0];
    await doc.ref.delete();

    return { message: `Successfully deleted the ${entity || 'record'}.`, data: null };
  } catch (error) {
    console.error('Error deleting record:', error);
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      throw new Error('Firebase authentication failed.');
    }
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index.');
    }
    throw new Error(`Failed to delete record: ${error.message}`);
  }
};

/**
 * Display/List records
 * Returns { message: string, data: Array }
 */
const displayRecords = async (entity, filters, limit = 50) => {
  try {
    if (!isFirestoreReady()) throw new Error('Firestore is not properly initialized.');

    console.log(`Firestore operation: displayRecords for entity="${entity}"`);

    let query = firestoreAdmin.collection(COLLECTION_NAME);

    // Treat 'records', 'database', 'all' as WILDCARDS (no filter)
    const genericEntities = ['records', 'record', 'database', 'databases', 'all', 'everything', 'data'];
    const normalized = normalizeEntity(entity);
    const isGeneric = !entity || genericEntities.includes(normalized) || genericEntities.includes(entity?.toLowerCase());

    if (entity && !isGeneric) {
      query = query.where('entity', '==', normalized);
    }

    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (key !== 'entity') {
          if (key.toLowerCase().includes('min') || key.toLowerCase().includes('max')) {
            const fieldName = key.replace(/min|max/gi, '').toLowerCase();
            const value = filters[key];
            if (key.toLowerCase().includes('min')) query = query.where(fieldName, '>=', value);
            else query = query.where(fieldName, '<=', value);
          } else if (key === 'joinedLastMonth') {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            query = query.where('joinDate', '>=', lastMonth);
          } else {
            query = query.where(key, '==', filters[key]);
          }
        }
      });
    }

    const snapshot = await query.limit(limit).get();
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const count = records.length;

    // Create summary
    let message = "";
    if (count === 0) message = `No records found${entity && !isGeneric ? ` for ${entity}` : ''}.`;
    else message = `Found ${count} records${entity && !isGeneric ? ` in ${entity}` : ''}.`;

    return { message, data: records };

  } catch (error) {
    console.error('Error displaying records:', error);
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      throw new Error('Firebase authentication failed.');
    }
    if (error.code === 'failed-precondition') {
      throw new Error('Query requires a composite index.');
    }
    throw new Error(`Failed to display records: ${error.message}`);
  }
};

const countRecords = async (entity, filters) => {
  try {
    if (!isFirestoreReady()) throw new Error('Firestore is not properly initialized.');

    let query = firestoreAdmin.collection(COLLECTION_NAME);
    if (entity) query = query.where('entity', '==', normalizeEntity(entity));

    // ... apply filters (simplified for brevity as logic is same as before)
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (key !== 'entity') {
          query = query.where(key, '==', filters[key]);
        }
      });
    }

    const snapshot = await query.get();
    const count = snapshot.size;

    return { message: `Count: ${count} ${entity || 'records'}.`, data: [{ count }] };
  } catch (error) {
    console.error('Error counting records:', error);
    throw new Error(`Failed to count records: ${error.message}`);
  }
};

/**
 * Main database handler
 */
const handleDatabaseOperation = async (action, entity, parameters) => {
  const { filters = {}, data = {} } = parameters || {};

  switch (action.toLowerCase()) {
    case 'add': case 'create':
      return await addRecord(entity, data);
    case 'modify': case 'update': case 'edit':
      return await modifyRecord(entity, filters, data);
    case 'delete': case 'remove':
      return await deleteRecord(entity, filters);
    case 'display': case 'list': case 'show':
      return await displayRecords(entity, filters);
    case 'count':
      return await countRecords(entity, filters);
    default:
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

