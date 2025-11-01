#!/usr/bin/env node
/**
 * Database Test Script
 * Tests database operations with sample data
 */

require('dotenv').config();
const db = require('./database');

// Sample test data
const sampleWallet = {
    wallet_address: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx4P9HH5mp',
    age_days: 365,
    first_transaction_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    total_sol_transacted: 1250.5,
    total_transactions: 523,
    protocol_diversity: 12,
    token_count: 24,
    portfolio_value_usd: 15420.75,
    current_balance_sol: 42.3,
    swap_count: 145,
    lp_stake_count: 23,
    airdrop_count: 8,
    nft_mint_count: 5,
    nft_sale_count: 3,
    risk_score: 22,
    risk_level: 'LOW',
    wallet_type: 'NORMAL',
    is_honeypot: false,
    is_bot: false,
    is_scam: false,
    farcaster_fid: 12345,
    farcaster_username: 'degentrader',
    farcaster_display_name: 'Degen Trader 🚀',
    farcaster_bio: 'Solana DeFi enthusiast | Building the future',
    farcaster_followers: 1250,
    farcaster_following: 450,
    farcaster_casts: 2340,
    farcaster_verified: true,
    farcaster_power_badge: true,
    farcaster_active_badge: true,
    farcaster_score: 87,
    gm_casts_count: 180,
    gm_total_likes: 2450,
    gm_total_recasts: 890,
    gm_engagement_rate: 18.5,
    gm_consistency_days: 120,
    gm_score: 75,
    trust_score: 82,
    trust_breakdown: {
        inverse_risk: 31.2,
        farcaster: 26.1,
        gm: 15.0,
        age_bonus: 9.7
    },
    social_verification_bonus: 15
};

async function testWalletAnalysisOps() {
    console.log('Testing Wallet Analysis Operations...\n');
    
    // Test upsert
    console.log('1️⃣ Testing wallet data upsert...');
    const inserted = await db.walletAnalysis.upsert(sampleWallet);
    console.log('✅ Wallet data inserted:', inserted.wallet_address);
    console.log(`   Trust Score: ${inserted.trust_score}, Farcaster Score: ${inserted.farcaster_score}`);
    
    // Test get by address
    console.log('\n2️⃣ Testing get by address...');
    const retrieved = await db.walletAnalysis.getByAddress(sampleWallet.wallet_address);
    console.log('✅ Wallet data retrieved:', retrieved.wallet_address);
    console.log(`   Risk Level: ${retrieved.risk_level}, Wallet Type: ${retrieved.wallet_type}`);
    
    // Test update (upsert with modified data)
    console.log('\n3️⃣ Testing wallet data update...');
    const updated = await db.walletAnalysis.upsert({
        ...sampleWallet,
        trust_score: 85,
        farcaster_followers: 1300
    });
    console.log('✅ Wallet data updated');
    console.log(`   New Trust Score: ${updated.trust_score}, New Followers: ${updated.farcaster_followers}`);
    
    console.log('\n✅ Wallet Analysis Operations Test Passed!\n');
}

async function testTransactionOps() {
    console.log('Testing Transaction Operations...\n');
    
    const sampleTransaction = {
        wallet_address: sampleWallet.wallet_address,
        signature: '5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7',
        block_time: new Date(),
        slot: 150000000,
        fee: 0.000005,
        success: true,
        tx_type: 'SWAP',
        programs: ['JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'],
        token_transfers: [
            { from: sampleWallet.wallet_address, to: 'DEXAddress', mint: 'SOL', amount: 1.5 },
            { from: 'DEXAddress', to: sampleWallet.wallet_address, mint: 'USDC', amount: 150.25 }
        ],
        sol_change: -1.500005,
        raw_data: { memo: 'Test swap transaction' }
    };
    
    console.log('1️⃣ Testing transaction insert...');
    const inserted = await db.transaction.insert(sampleTransaction);
    console.log('✅ Transaction inserted:', inserted.signature.substring(0, 20) + '...');
    
    console.log('\n2️⃣ Testing get transactions by wallet...');
    const transactions = await db.transaction.getByWallet(sampleWallet.wallet_address, 10);
    console.log(`✅ Retrieved ${transactions.length} transactions`);
    
    console.log('\n✅ Transaction Operations Test Passed!\n');
}

async function testRiskAssessmentOps() {
    console.log('Testing Risk Assessment Operations...\n');
    
    const sampleAssessment = {
        wallet_address: sampleWallet.wallet_address,
        risk_score: 22,
        risk_level: 'LOW',
        age_risk: 10,
        balance_risk: 15,
        activity_risk: 5,
        diversity_risk: 8,
        pattern_risk: 12,
        honeypot_indicators: { high_balance_low_activity: false },
        bot_indicators: { excessive_nft_mints: false },
        scam_indicators: { suspicious_patterns: false },
        social_verification_bonus: 15,
        farcaster_score_at_time: 87,
        assessment_reason: 'SCHEDULED'
    };
    
    console.log('1️⃣ Testing risk assessment insert...');
    const inserted = await db.riskAssessment.insert(sampleAssessment);
    console.log('✅ Risk assessment inserted');
    console.log(`   Risk Score: ${inserted.risk_score}, Level: ${inserted.risk_level}`);
    
    console.log('\n2️⃣ Testing get assessment history...');
    const history = await db.riskAssessment.getHistory(sampleWallet.wallet_address, 5);
    console.log(`✅ Retrieved ${history.length} assessment records`);
    
    console.log('\n✅ Risk Assessment Operations Test Passed!\n');
}

async function testViews() {
    console.log('Testing Database Views...\n');
    
    console.log('1️⃣ Testing top_trusted_wallets view...');
    const trusted = await db.walletAnalysis.getTopTrusted(5);
    console.log(`✅ Retrieved ${trusted.length} trusted wallets`);
    
    console.log('\n2️⃣ Testing high_risk_wallets view...');
    const highRisk = await db.walletAnalysis.getHighRisk(5);
    console.log(`✅ Retrieved ${highRisk.length} high-risk wallets`);
    
    console.log('\n3️⃣ Testing active_social_wallets view...');
    const social = await db.walletAnalysis.getActiveSocial(5);
    console.log(`✅ Retrieved ${social.length} active social wallets`);
    
    console.log('\n✅ Database Views Test Passed!\n');
}

async function main() {
    console.log('🧪 Starting database operations test...\n');
    console.log('═'.repeat(50) + '\n');
    
    try {
        // Test connection
        console.log('📡 Testing database connection...');
        await db.testConnection();
        console.log('✅ Connection test passed\n');
        console.log('═'.repeat(50) + '\n');
        
        // Run tests
        await testWalletAnalysisOps();
        console.log('═'.repeat(50) + '\n');
        
        await testTransactionOps();
        console.log('═'.repeat(50) + '\n');
        
        await testRiskAssessmentOps();
        console.log('═'.repeat(50) + '\n');
        
        await testViews();
        console.log('═'.repeat(50) + '\n');
        
        console.log('🎉 All database tests passed successfully!\n');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

// Run tests
main();
