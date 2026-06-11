const text = `1  FABRICS 540821
HSN: 540821   |   CREPE 44" TP-48
4927.500 
Mtr
92.00 22,666.50 (5%)   4,30,663.50 21,533.18 (5%) 4,52,196.68
2  FABRICS 540821
HSN: 540821   |   DOLLA 44" TP-6
625.000 Mtr 79.00  2,468.75 (5%) 46,906.25  2,345.32 (5%)  49,251.57`;

const r = /(?:^|\n)\s*(?:\d{1,3}\s+)?([A-Za-z0-9][\s\S]{4,150}?)\s+(\d+(?:\.\d{1,3})?)(?:\s+(?:Mtrs?|Pcs|Kgs?|Nos?|Units?|Mtr|Pieces|Meters|Rolls?))?\s+([0-9,]{1,8}\.\d{2})\s+(?:([0-9,]{1,8}\.\d{2})(?:\s*\(\d+%\))?\s+)?([0-9,]{1,12}\.\d{2})(?:\s+([0-9,]{1,12}\.\d{2})(?:\s*\(\d+%\))?)?/gi;

const matches = Array.from(text.matchAll(r));
matches.forEach(m => {
  console.log('Desc:', JSON.stringify(m[1].replace(/\n/g, ' ').trim()));
  console.log('Qty:', m[2]);
  console.log('Rate:', m[3]);
  console.log('Disc:', m[4]);
  console.log('Amount:', m[5]);
  console.log('Taxes:', m[6]);
  console.log('---');
});
