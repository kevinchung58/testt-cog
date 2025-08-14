// Manual mock for the '@browserbasehq/stagehand' package.
console.log('JEST: Using manual mock for @browserbasehq/stagehand.');

const mockPage = {
    goto: jest.fn().mockResolvedValue(undefined),
    extract: jest.fn().mockResolvedValue({
        results: [
            { title: 'Mock Search Result', link: 'https://example.com', snippet: 'This is a mock result from the manual mock.' }
        ]
    }),
};

const mockStagehand = {
    init: jest.fn().mockResolvedValue(undefined),
    page: mockPage,
    close: jest.fn().mockResolvedValue(undefined),
};

export const Stagehand = jest.fn(() => mockStagehand);
