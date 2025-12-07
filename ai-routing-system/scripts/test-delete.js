const { handleDatabaseOperation } = require('../src/controllers/databaseController');

async function testDelete() {
    try {
        console.log('--- Testing Delete with Generic Entity ---');

        // 1. Add a test record
        console.log('Adding test record...');
        const addResult = await handleDatabaseOperation('add', 'products', { data: { name: 'DeleteMe_IceCream', price: 5 } });
        console.log('Add Result:', addResult.message);

        // 2. Delete it using generic 'record' entity, hoping wildcard logic works
        console.log('Deleting using entity="record"...');
        const deleteResult = await handleDatabaseOperation('delete', 'record', { filters: { name: 'DeleteMe_IceCream' } });
        console.log('Delete Result:', deleteResult.message);

        if (deleteResult.message.includes('Successfully deleted')) {
            console.log('✅ TEST PASSED: Wildcard delete worked.');
        } else {
            console.log('❌ TEST FAILED: Could not delete.');
        }

    } catch (error) {
        console.error('Test Error:', error);
    }
}

testDelete();
