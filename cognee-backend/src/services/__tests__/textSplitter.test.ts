import { splitText, splitBySentences, TextSplitterOptions } from '../textSplitter';

describe('Text Splitter Service', () => {
  describe('splitText (character-based)', () => {
    it('should split text into chunks of specified size without overlap', () => {
      const text = 'abcdefghijklmnopqrstuvwxyz';
      const options: TextSplitterOptions = { chunkSize: 10, chunkOverlap: 0 };
      const chunks = splitText(text, options);
      // Iteration 1: i=0, end=10 -> 'abcdefghij', i becomes 10
      // Iteration 2: i=10, end=20 -> 'klmnopqrst', i becomes 20
      // Iteration 3: i=20, end=26 -> 'uvwxyz', i becomes 30
      expect(chunks).toEqual(['abcdefghij', 'klmnopqrst', 'uvwxyz']);
    });

    it('should handle overlap correctly', () => {
      const text = 'abcdefghijklmnopqrstuvwxyz';
      // The test that was failing
      const options: TextSplitterOptions = { chunkSize: 10, chunkOverlap: 3 };
      const chunks = splitText(text, options);
      // Iteration 1: i=0, end=10 -> 'abcdefghij', i becomes 7
      // Iteration 2: i=7, end=17 -> 'hijklmnopq', i becomes 14
      // Iteration 3: i=14, end=24 -> 'opqrstuvwx', i becomes 21
      // Iteration 4: i=21, end=26 -> 'vwxyz', i becomes 28
      expect(chunks).toEqual(['abcdefghij', 'hijklmnopq', 'opqrstuvwx', 'vwxyz']);
    });

    it('should return a single chunk if text is smaller than chunk size', () => {
      const text = 'abc';
      const options: TextSplitterOptions = { chunkSize: 10, chunkOverlap: 0 };
      const chunks = splitText(text, options);
      expect(chunks).toEqual(['abc']);
    });

    it('should handle text that is exactly chunk size', () => {
      const text = 'abcdefghij';
      const options: TextSplitterOptions = { chunkSize: 10, chunkOverlap: 0 };
      const chunks = splitText(text, options);
      expect(chunks).toEqual(['abcdefghij']);
    });

    it('should handle complex overlap correctly', () => {
      const text = 'abcde';
      const options: TextSplitterOptions = { chunkSize: 3, chunkOverlap: 2 };
      // 1. abc (i=0, end=3) -> i becomes 1
      // 2. bcd (i=1, end=4) -> i becomes 2
      // 3. cde (i=2, end=5) -> i becomes 3
      // 4. de  (i=3, end=5) -> i becomes 4
      // 5. e   (i=4, end=5) -> i becomes 5
      expect(splitText(text, options)).toEqual(['abc', 'bcd', 'cde', 'de', 'e']);
    });
  });

  describe('splitBySentences', () => {
    it('should group sentences into a single chunk if total length is less than maxCharsPerChunk', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      // Total length is well under 1000, so it should be one chunk.
      const chunks = splitBySentences(text, 1000);
      expect(chunks).toEqual(['First sentence. Second sentence! Third sentence?']);
    });

    it('should split sentences into multiple chunks when they exceed maxCharsPerChunk', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.';
      // Each sentence is ~14 chars long. With spaces, "Sentence one. Sentence two." is 28 chars.
      const chunks = splitBySentences(text, 30);
      expect(chunks).toEqual(['Sentence one. Sentence two.', 'Sentence three. Sentence four.', 'Sentence five.']);
    });

    it('should handle text with no sentence terminators as a single chunk', () => {
        const text = 'A long string without periods or exclamation marks';
        const chunks = splitBySentences(text);
        expect(chunks).toEqual([text]);
    });

    it('should correctly handle leading/trailing whitespace and group sentences', () => {
        const text = '  First sentence.  Second sentence!  ';
        const chunks = splitBySentences(text, 1000);
        // The implementation joins with a space, so the result is correct.
        expect(chunks).toEqual(['First sentence. Second sentence!']);
    });

    it('should return empty array for empty or whitespace-only text', () => {
        expect(splitBySentences('')).toEqual([]);
        expect(splitBySentences('   ')).toEqual([]);
    });

    it('should not break up a single sentence that is longer than maxCharsPerChunk', () => {
        const longSentence = 'This is a single very long sentence that absolutely exceeds the maximum chunk size but should not be broken up.';
        const chunks = splitBySentences(longSentence, 30);
        // The current implementation does not split single sentences that are too long. It respects sentence integrity.
        expect(chunks).toEqual([longSentence]);
    });
  });
});
