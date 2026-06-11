const text = `Net payable ₹ 9,93,070.00`;
const match = text.match(/(?:Grand\s+Total|Total\s+Invoice\s+Value|Net\s+payable|Net\s+Amount)[^\d\n]*([0-9,]+\.[0-9]{2})/i);
console.log('Grand Total:', match ? match[1] : null);
