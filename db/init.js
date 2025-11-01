#!/usr/bin/env node
/**
 * Database Initialization Script
 * Sets up PostgreSQL database and tables
 */

require('dotenv').config();
const db = require('./database');

async function main() {
    console.log('🚀 Starting database initialization...\n');
    
    try {
        // Test connection
        console.log('📡 Testing database connection...');
        await db.testConnection();
        console.log('✅ Connection test passed\n');
        
        // Initialize schema
        console.log('📋 Creating database schema...');
        await db.initializeDatabase();
        console.log('✅ Schema created successfully\n');
        
        // Verify tables
        console.log('🔍 Verifying tables...');
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('Created tables:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // Verify views
        const viewsResult = await db.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('\nCreated views:');
        viewsResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        console.log('\n✅ Database initialization completed successfully!');
        console.log('🎉 Ready to start wallet analysis\n');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

main();
