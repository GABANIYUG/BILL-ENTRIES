import pdfParse from 'pdf-parse';

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{ textStandard: string, textMerged: string }> {
  try {
    const dataStandard = await pdfParse(buffer);
    
    const optionsMerge = {
      pagerender: async function(pageData: any) {
        const textContent = await pageData.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false
        });
        
        // Sort items by Y (descending) then X (ascending)
        const items = textContent.items.sort((a: any, b: any) => {
          if (Math.abs(a.transform[5] - b.transform[5]) > 4) {
            return b.transform[5] - a.transform[5];
          }
          return a.transform[4] - b.transform[4];
        });

        let lastY, text = '';
        for (const item of items) {
          if (!lastY || Math.abs(lastY - item.transform[5]) < 4) {
            if (text && !text.endsWith(' ') && item.str && !item.str.startsWith(' ') && text !== '\n') {
              text += '   ' + item.str; // Use larger space for joined distant columns
            } else {
              text += item.str;
            }
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return text + '\n\n---PAGE_BREAK---\n\n';
      }
    };
    
    const dataMerged = await pdfParse(buffer, optionsMerge);
    
    return { textStandard: dataStandard.text, textMerged: dataMerged.text };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF deterministically.');
  }
}
