// 날짜 파싱 테스트
const dateStr = "2025. 10. 28.";

console.log('원본 날짜:', dateStr);

// 방법 1: 점과 공백을 하이픈으로 변환
let cleanDate1 = dateStr.replace(/\./g, '-').replace(/\s+/g, '');
console.log('변환 1:', cleanDate1); // "2025-10-28-"

// 마지막 하이픈 제거
if (cleanDate1.endsWith('-')) {
    cleanDate1 = cleanDate1.slice(0, -1);
}
console.log('변환 2 (마지막 하이픈 제거):', cleanDate1); // "2025-10-28"

const parsedDate1 = new Date(cleanDate1);
console.log('Date 객체:', parsedDate1);
console.log('isValid:', !isNaN(parsedDate1.getTime()));
console.log('ISO 문자열:', parsedDate1.toISOString());
console.log('결과:', parsedDate1.toISOString().split('T')[0]);

// 방법 2: 정규식으로 직접 추출
const match = dateStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
if (match) {
    const [_, year, month, day] = match;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    console.log('\n정규식 방법:', isoDate);
    const parsedDate2 = new Date(isoDate);
    console.log('Date 객체:', parsedDate2);
    console.log('결과:', parsedDate2.toISOString().split('T')[0]);
}
