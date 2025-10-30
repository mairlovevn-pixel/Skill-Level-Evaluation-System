const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('assessment_detailed_sample.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('🔍 Finding rows with undefined "평가 결과"...\n');

data.forEach((row, index) => {
  if (row['평가 결과'] === undefined || row['평가 결과'] === null || row['평가 결과'] === '') {
    console.log(`❌ Row ${index + 1} (Excel row ${index + 2}):`)
    console.log(JSON.stringify(row, null, 2));
    console.log('\n');
  }
});

console.log('✅ Search complete!');
