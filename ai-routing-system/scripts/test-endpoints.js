const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2 && !line.startsWith('#')) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.warn('Could not load .env.local');
    }
}

loadEnv();

const API_URL = 'http://localhost:3000/api/query';

// Helpers for coloring (using ANSI codes directly)
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';

const log = (msg, color = RESET) => console.log(`${color}${msg}${RESET}`);
const section = (msg) => console.log(`\n${CYAN}${msg}${RESET}\n${'='.repeat(50)}`);

async function apiCall(query) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TEST_ID_TOKEN || 'mock-token'}`
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { error: error.message };
    }
}

async function runTests() {
    try {
        section('🚀 STARTING API VERIFICATION SUITE (Zero Dependency)');

        // A. WEATHER
        log('A. TEST WEATHER (Standard)', CYAN);
        const weatherRes = await apiCall('Weather in Mumbai');
        if (weatherRes.data && typeof weatherRes.data.response === 'string' && weatherRes.data.response.includes('Mumbai')) {
            log('   ✅ Weather verified', GREEN);
        } else {
            log('   ❌ Weather failed', RED);
            console.log(JSON.stringify(weatherRes, null, 2));
        }

        // B. DATABASE - ADD (Standard)
        log('B. TEST DATABASE ADD (Explicit)', CYAN);
        const addRes = await apiCall('Add a new product: Gaming Laptop, price: 1500, stock: 10');
        if (addRes.data && (JSON.stringify(addRes.data).includes('uccessfully added') || JSON.stringify(addRes.data).includes('Gaming Laptop'))) {
            log('   ✅ Add Record verified', GREEN);
        } else {
            log('   ❌ Add Record failed', RED);
            console.log(JSON.stringify(addRes, null, 2));
        }

        // C. DATABASE - LIST
        log('C. TEST DATABASE LIST', CYAN);
        const listRes = await apiCall('List products');
        // Check for NEW data structure { message, data }
        if (listRes.data && listRes.data.data && Array.isArray(listRes.data.data)) {
            log('   ✅ List Records verified (Structure: {message, data})', GREEN);
            if (listRes.data.data.length > 0) log(`      Found ${listRes.data.data.length} records.`, YELLOW);
        } else {
            log('   ❌ List Records failed structure check', RED);
            console.log(JSON.stringify(listRes, null, 2));
        }

        // D. SMART INFERENCE (New Feature)
        log('D. TEST ENTITY INFERENCE ("Salary" -> "Employees")', CYAN);
        const inferenceRes = await apiCall('Add Anurag salary 50000');
        // Should infer 'employees' entity
        if (inferenceRes.data && JSON.stringify(inferenceRes.data).includes('employees') && JSON.stringify(inferenceRes.data).includes('uccessfully')) {
            log('   ✅ Smart Inference verified', GREEN);
        } else {
            log('   ❌ Smart Inference failed', RED);
            console.log(JSON.stringify(inferenceRes, null, 2));
        }

        // E. MISSING INFO GUIDANCE
        log('E. TEST MISSING INFO', CYAN);
        const missingRes = await apiCall('Add a record');
        if (missingRes.data && missingRes.data.response && (missingRes.data.response.includes('details') || missingRes.data.response.includes('try'))) {
            log('   ✅ Missing Info Guidance verified', GREEN);
        } else {
            log('   ❌ Missing Info check failed', RED);
            console.log(JSON.stringify(missingRes, null, 2));
        }

        section('🎉 TEST SUITE COMPLETED');

    } catch (error) {
        console.error('Test Suite Error:', error);
    }
}

runTests();
