export interface TextSplitterOptions {
  chunkSize: number; // Target size of each chunk
  chunkOverlap?: number; // Optional overlap between chunks
}

// Basic splitter by character count with overlap
export function splitText(text: string, options: TextSplitterOptions): string[] {
  const { chunkSize, chunkOverlap = 0 } = options;
  if (chunkOverlap >= chunkSize) {
    throw new Error('Chunk overlap cannot be greater than or equal to chunk size.');
  }

  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.substring(i, end));
    i += (chunkSize - chunkOverlap);
  }
  return chunks.filter(chunk => chunk.trim() !== ''); // Remove empty chunks
}

// A more robust, manual sentence splitter
export function splitBySentences(text: string, maxCharsPerChunk: number = 1000): string[] {
    if (!text || text.trim() === '') {
        return [];
    }

    const sentences: string[] = [];
    const terminators = ['.', '!', '?'];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
        if (terminators.includes(text[i])) {
            // Check if the next character is a space or end of string, to better handle abbreviations etc.
            if (i === text.length - 1 || text[i+1] === ' ') {
                sentences.push(text.substring(lastIndex, i + 1).trim());
                lastIndex = i + 2; // Move past the terminator and the space
            }
        }
    }
    // Add the remainder of the text if it's not empty
    if (lastIndex < text.length) {
        sentences.push(text.substring(lastIndex).trim());
    }

    const filteredSentences = sentences.filter(s => s.length > 0);

    if (filteredSentences.length === 0 && text.trim().length > 0) {
        return [text];
    }

    const chunks: string[] = [];
    let currentChunk = "";
    for (const sentence of filteredSentences) {
        if ((currentChunk + ' ' + sentence).length > maxCharsPerChunk && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    return chunks;
}
