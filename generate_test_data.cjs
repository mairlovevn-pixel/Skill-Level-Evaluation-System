/**
 * Generate comprehensive test Supervisor Assessment data
 * This creates realistic assessment data for all workers to test the dashboard
 */

const BASE_URL = 'http://localhost:3000';

async function generateTestData() {
    console.log('🔍 Fetching workers and assessment items...\n');
    
    // Get all workers
    const workersResponse = await fetch(`${BASE_URL}/api/workers`);
    const workers = await workersResponse.json();
    console.log(`✅ Found ${workers.length} workers`);
    
    // Get all assessment items
    const itemsResponse = await fetch(`${BASE_URL}/api/assessment-items`);
    const assessmentItems = await itemsResponse.json();
    console.log(`✅ Found ${assessmentItems.length} assessment items\n`);
    
    // Group items by category
    const itemsByCategory = {
        'Level2': [],
        'Level3': [],
        'Level4': []
    };
    
    assessmentItems.forEach(item => {
        if (itemsByCategory[item.category]) {
            itemsByCategory[item.category].push(item);
        }
    });
    
    console.log(`📋 Items by category:`);
    console.log(`  - Level2: ${itemsByCategory.Level2.length} items`);
    console.log(`  - Level3: ${itemsByCategory.Level3.length} items`);
    console.log(`  - Level4: ${itemsByCategory.Level4.length} items\n`);
    
    console.log('🎲 Generating assessment data...\n');
    
    let totalAssessments = 0;
    const allAssessments = [];
    
    for (const worker of workers) {
        // Determine worker's performance tier (realistic distribution)
        const rand = Math.random();
        let performanceTier;
        if (rand < 0.2) performanceTier = 'excellent';      // 20%
        else if (rand < 0.7) performanceTier = 'good';      // 50%
        else performanceTier = 'average';                    // 30%
        
        // Select 5-10 random items from each category
        const numLevel2 = Math.floor(Math.random() * 6) + 5; // 5-10
        const numLevel3 = Math.floor(Math.random() * 6) + 5;
        const numLevel4 = Math.floor(Math.random() * 6) + 5;
        
        const selectedItems = [
            ...getRandomItems(itemsByCategory.Level2, Math.min(numLevel2, itemsByCategory.Level2.length)),
            ...getRandomItems(itemsByCategory.Level3, Math.min(numLevel3, itemsByCategory.Level3.length)),
            ...getRandomItems(itemsByCategory.Level4, Math.min(numLevel4, itemsByCategory.Level4.length))
        ];
        
        // Create assessments for selected items
        for (const item of selectedItems) {
            let level;
            
            // Assign level based on performance tier
            if (performanceTier === 'excellent') {
                const levels = [3, 4, 5];
                const weights = [0.1, 0.4, 0.5]; // 10%, 40%, 50%
                level = weightedRandom(levels, weights);
            } else if (performanceTier === 'good') {
                const levels = [2, 3, 4];
                const weights = [0.2, 0.5, 0.3]; // 20%, 50%, 30%
                level = weightedRandom(levels, weights);
            } else { // average
                const levels = [1, 2, 3];
                const weights = [0.2, 0.5, 0.3]; // 20%, 50%, 30%
                level = weightedRandom(levels, weights);
            }
            
            allAssessments.push({
                employee_id: worker.employee_id,
                category: item.category,
                item_name: item.item_name,
                level: level
            });
            
            totalAssessments++;
        }
    }
    
    console.log(`📊 Generated ${totalAssessments} assessments for ${workers.length} workers`);
    console.log(`📈 Average: ${(totalAssessments / workers.length).toFixed(1)} assessments per worker\n`);
    
    // Upload assessments in batch
    console.log('📤 Uploading assessments to database...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/results/assessment/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(allAssessments)
        });
        const result = await response.json();
        console.log(`✅ Successfully uploaded ${result.count} assessments!\n`);
    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        return;
    }
    
    // Verify data
    console.log('🔍 Verifying data...');
    const verifyResponse = await fetch(`${BASE_URL}/api/results/assessment`);
    const verifiedData = await verifyResponse.json();
    
    console.log(`\n✅ Verification: ${verifiedData.length} assessment records in database\n`);
    
    // Summary by entity
    const byEntity = {};
    verifiedData.forEach(record => {
        if (!byEntity[record.entity]) {
            byEntity[record.entity] = {
                workers: new Set(),
                assessments: 0,
                totalLevel: 0
            };
        }
        byEntity[record.entity].workers.add(record.employee_id);
        byEntity[record.entity].assessments++;
        byEntity[record.entity].totalLevel += record.level;
    });
    
    console.log('📈 Summary by Entity:');
    console.log('-'.repeat(70));
    for (const [entity, data] of Object.entries(byEntity)) {
        const avgLevel = (data.totalLevel / data.assessments).toFixed(2);
        console.log(`${entity.padEnd(6)} | Workers: ${data.workers.size.toString().padStart(2)} | Assessments: ${data.assessments.toString().padStart(4)} | Avg Level: ${avgLevel}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ Test data generation complete!');
    console.log('📊 You can now test the dashboard with comprehensive data');
    console.log('🗑️  To delete this test data, run:');
    console.log('    npx wrangler d1 execute webapp-production --local --command="DELETE FROM supervisor_assessments;"');
    console.log('='.repeat(70));
}

// Helper functions
function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function weightedRandom(items, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    
    return items[items.length - 1];
}

// Run the generator
generateTestData().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
