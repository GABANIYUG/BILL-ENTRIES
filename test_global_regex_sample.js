const text = `MALAY 3271.00 39.75 1,30,022.25`;
const r = /(?:^|\n)\s*(?:\d{1,3}\s+)?([A-Za-z0-9][\s\S]{4,150}?)\s+(\d+(?:\.\d{1,3})?)(?:\s+(?:Mtrs?|Pcs|Kgs?|Nos?|Units?|Mtr|Pieces|Meters|Rolls?))?\s+([0-9,]{1,8}\.\d{2})\s+(?:([0-9,]{1,8}\.\d{2})(?:\s*\(\d+%\))?\s+)?([0-9,]{1,12}\.\d{2})(?:\s+([0-9,]{1,12}\.\d{2})(?:\s*\(\d+%\))?)?/gi;
console.log(Array.from(text.matchAll(r)).length);
