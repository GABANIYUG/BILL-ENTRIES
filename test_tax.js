const text = `Basic Amount ₹ 9,45,781.00
CGST ₹ 23,644.52
SGST ₹ 23,644.52
Round off ₹ -0.04
Net payable ₹ 9,93,070.00`;

function extractMaxTax(keyword) {
    const regex = new RegExp(keyword + '[^\\d\\n]{0,25}([0-9,]+\\.[0-9]{2})', 'i');
    const match = text.match(regex);
    return match ? match[1] : null;
}

console.log('CGST:', extractMaxTax('CGST'));
console.log('SGST:', extractMaxTax('SGST'));
console.log('Round off:', extractMaxTax('Round\\s*off'));
console.log('Basic Amount:', extractMaxTax('Basic\\s+Amount'));
console.log('Net payable:', extractMaxTax('Net\\s+payable'));
