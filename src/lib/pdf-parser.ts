import pdfParse from 'pdf-parse';

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const options = {
    pagerender: async function(pageData: any) {
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });
      let lastY, text = '';
      for (const item of textContent.items) {
        // Allow a slight tolerance (e.g. 2 points) for Y-coordinates to account for imperfect alignments
        if (!lastY || Math.abs(lastY - item.transform[5]) < 4) {
          // If the items don't have natural spacing, add a space
          if (text && !text.endsWith(' ') && item.str && !item.str.startsWith(' ') && text !== '\n') {
            text += ' ' + item.str;
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
  
  try {
    const data = await pdfParse(buffer, options);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF deterministically.');
  }
}
