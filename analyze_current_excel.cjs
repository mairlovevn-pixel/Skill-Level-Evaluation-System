const XLSX = require('xlsx');

// Read the current Excel file
const workbook = XLSX.readFile('current_assessment.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Current Excel File Analysis');
console.log('='.repeat(80));
console.log(`Total rows: ${data.length}`);
console.log(`\n📋 Column Headers:`);
console.log(Object.keys(data[0]));

console.log('\n📝 First 3 rows:');
data.slice(0, 3).forEach((row, index) => {
  console.log(`\n--- Row ${index + 1} ---`);
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n📝 Last 3 rows:');
data.slice(-3).forEach((row, index) => {
  console.log(`\n--- Row ${data.length - 2 + index} ---`);
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n🔍 Missing "평가 결과" rows:');
const missingResults = data.filter(row => !row['평가 결과']);
console.log(`Found ${missingResults.length} rows without 평가 결과`);
missingResults.slice(0, 5).forEach((row, index) => {
  console.log(`\nMissing row ${index + 1}:`);
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n📊 Statistics by worker:');
const workerStats = {};
data.forEach(row => {
  const id = row['사번'];
  if (!workerStats[id]) {
    workerStats[id] = { name: row['이름'], total: 0, withResult: 0, withoutResult: 0 };
  }
  workerStats[id].total++;
  if (row['평가 결과']) {
    workerStats[id].withResult++;
  } else {
    workerStats[id].withoutResult++;
  }
});

Object.entries(workerStats).forEach(([id, stats]) => {
  console.log(`${id} (${stats.name}): Total=${stats.total}, With Result=${stats.withResult}, Missing=${stats.withoutResult}`);
});

console.log('\n✅ Analysis complete!');
