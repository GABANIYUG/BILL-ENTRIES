import pdfParse from 'pdf-parse';

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const options = {
    // pdf-parse options if needed
  };
  
  try {
    const data = await pdfParse(buffer, options);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF deterministically.');
  }
}
