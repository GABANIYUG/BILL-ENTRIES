const text = `27: Item Qty Rate   Discount Amount Taxes Total
28: 1  FABRICS 540821
29: HSN: 540821   |   CREPE 44" TP-52
30: 5006.750 
31: Mtr
32: 94.00 0.00   4,70,634.50 23,531.72 (5%)  4,94,166.22`;

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
