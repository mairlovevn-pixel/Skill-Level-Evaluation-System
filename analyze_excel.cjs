const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('assessment_detailed_sample.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Excel File Analysis');
console.log('='.repeat(80));
console.log(`Total rows: ${data.length}`);
console.log('\n📋 Column Headers:');
console.log(Object.keys(data[0]));

console.log('\n📝 First 5 rows:');
data.slice(0, 5).forEach((row, index) => {
  console.log(`\n--- Row ${index + 1} ---`);
  console.log(JSON.stringify(row, null, 2));
});

console.log('\n🔍 Unique values in "평가 결과" column:');
const uniqueResults = [...new Set(data.map(row => row['평가 결과']))];
console.log(uniqueResults);

console.log('\n📊 Level distribution (if "레벨" column exists):');
if (data[0]['레벨']) {
  const levelCounts = {};
  data.forEach(row => {
    const level = row['레벨'];
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  });
  console.log(levelCounts);
}

console.log('\n📊 "평가 결과" distribution:');
const resultCounts = {};
data.forEach(row => {
  const result = row['평가 결과'];
  resultCounts[result] = (resultCounts[result] || 0) + 1;
});
console.log(resultCounts);

console.log('\n✅ Analysis complete!');
