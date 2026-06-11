import pdfParse from 'pdf-parse';

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ textStandard: string, textMerged: string }> {
  try {
    const options = {
      pagerender: async function(pageData: any) {
        const textContent = await pageData.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false
        });
        
        // 1. Standard Sequential Logic (matches pdf-parse default)
        let lastYStandard, textStandard = '';
        for (const item of textContent.items) {
          if (lastYStandard == item.transform[5] || !lastYStandard) {
            textStandard += item.str;
          } else {
            textStandard += '\n' + item.str;
          }
          lastYStandard = item.transform[5];
        }
        textStandard += '\n\n---PAGE_BREAK---\n\n';

        // 2. Merged Layout Logic (groups by Y-coordinate, sorts by X-coordinate)
        const items = [...textContent.items].sort((a: any, b: any) => {
          if (Math.abs(a.transform[5] - b.transform[5]) > 4) {
            return b.transform[5] - a.transform[5];
          }
          return a.transform[4] - b.transform[4];
        });

        let lastYMerged, textMerged = '';
        for (const item of items) {
          if (!lastYMerged || Math.abs(lastYMerged - item.transform[5]) < 4) {
            if (textMerged && !textMerged.endsWith(' ') && item.str && !item.str.startsWith(' ') && textMerged !== '\n') {
              textMerged += '   ' + item.str; // Use larger space for joined distant columns
            } else {
              textMerged += item.str;
            }
          } else {
            textMerged += '\n' + item.str;
          }
          lastYMerged = item.transform[5];
        }
        textMerged += '\n\n---PAGE_BREAK---\n\n';

        // Return as JSON string to bypass pdf-parse single string limitation
        return JSON.stringify({ std: textStandard, mrg: textMerged }) + ',';
      }
    };
    
    // Parse the PDF only ONCE
    const data = await pdfParse(buffer, options);
    
    // Decode the JSON strings generated per page
    const rawArrayString = '[' + data.text.replace(/,\s*$/, '') + ']';
    
    try {
      const parsedPages = JSON.parse(rawArrayString);
      const fullTextStandard = parsedPages.map((p: any) => p.std).join('');
      const fullTextMerged = parsedPages.map((p: any) => p.mrg).join('');
      return { textStandard: fullTextStandard, textMerged: fullTextMerged };
    } catch (e) {
      console.error('JSON parse fallback triggered', e);
      // Fallback in case JSON is somehow corrupted
      return { textStandard: data.text, textMerged: data.text };
    }
    
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF deterministically.');
  }
}
