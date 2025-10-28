#!/usr/bin/env python3
"""
Generate test Supervisor Assessment data for all workers
This creates comprehensive assessment data for dashboard testing
"""

import sqlite3
import random
from datetime import datetime, timedelta

# Connect to local D1 database
db_path = '/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("🔍 Fetching workers and assessment items...")

# Get all workers
cursor.execute("SELECT id, employee_id, name, entity FROM workers ORDER BY entity, employee_id")
workers = cursor.fetchall()
print(f"✅ Found {len(workers)} workers")

# Get assessment items by category
cursor.execute("SELECT id, category, item_name FROM supervisor_assessment_items ORDER BY category")
assessment_items = cursor.fetchall()
print(f"✅ Found {len(assessment_items)} assessment items")

# Group items by category
items_by_category = {
    'Level2': [],
    'Level3': [],
    'Level4': []
}

for item_id, category, item_name in assessment_items:
    items_by_category[category].append((item_id, item_name))

print(f"  - Level2: {len(items_by_category['Level2'])} items")
print(f"  - Level3: {len(items_by_category['Level3'])} items")
print(f"  - Level4: {len(items_by_category['Level4'])} items")

print("\n🎲 Generating assessment data...")

# Generate assessments for each worker
assessments_created = 0
assessment_date = datetime.now()

for worker_id, employee_id, name, entity in workers:
    # Determine worker's performance level (random but realistic distribution)
    # 20% excellent (4-5), 50% good (3-4), 30% average (2-3)
    performance_tier = random.choices(['excellent', 'good', 'average'], weights=[20, 50, 30])[0]
    
    # Select 5-10 random items from each category for comprehensive assessment
    num_level2 = random.randint(5, min(10, len(items_by_category['Level2'])))
    num_level3 = random.randint(5, min(10, len(items_by_category['Level3'])))
    num_level4 = random.randint(5, min(10, len(items_by_category['Level4'])))
    
    selected_items = []
    selected_items.extend(random.sample(items_by_category['Level2'], num_level2))
    selected_items.extend(random.sample(items_by_category['Level3'], num_level3))
    selected_items.extend(random.sample(items_by_category['Level4'], num_level4))
    
    # Assess each selected item
    for item_id, item_name in selected_items:
        # Determine level based on performance tier and some randomness
        if performance_tier == 'excellent':
            level = random.choices([3, 4, 5], weights=[10, 40, 50])[0]
        elif performance_tier == 'good':
            level = random.choices([2, 3, 4], weights=[20, 50, 30])[0]
        else:  # average
            level = random.choices([1, 2, 3], weights=[20, 50, 30])[0]
        
        # Insert assessment
        cursor.execute("""
            INSERT INTO supervisor_assessments 
            (worker_id, item_id, level, assessed_by, assessment_date, comments)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            worker_id,
            item_id,
            level,
            'Test Supervisor',
            assessment_date.strftime('%Y-%m-%d %H:%M:%S'),
            f'Test assessment for {name}'
        ))
        
        assessments_created += 1
    
    # Add slight time variation for realism
    assessment_date += timedelta(minutes=random.randint(5, 15))

# Commit all changes
conn.commit()

print(f"\n✅ Successfully created {assessments_created} assessment records!")
print(f"📊 Average assessments per worker: {assessments_created / len(workers):.1f}")

# Verify data
cursor.execute("""
    SELECT 
        w.entity,
        COUNT(DISTINCT w.id) as workers,
        COUNT(sa.id) as assessments,
        AVG(sa.level) as avg_level
    FROM workers w
    JOIN supervisor_assessments sa ON w.id = sa.worker_id
    GROUP BY w.entity
    ORDER BY w.entity
""")

print("\n📈 Summary by Entity:")
print("-" * 60)
for entity, workers_count, assessments_count, avg_level in cursor.fetchall():
    print(f"{entity:6} | Workers: {workers_count:2} | Assessments: {assessments_count:4} | Avg Level: {avg_level:.2f}")

print("\n" + "=" * 60)
print("✨ Test data generation complete!")
print("📊 You can now test the dashboard with comprehensive data")
print("🗑️  To delete this test data later, run:")
print("    DELETE FROM supervisor_assessments;")
print("=" * 60)

conn.close()
