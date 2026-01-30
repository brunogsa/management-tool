import { jest } from '@jest/globals';

// Mock dependencies
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockRenderImage = jest.fn();
const mockTasksTreeUseCase = jest.fn();
const mockStartDiagramViewer = jest.fn();
const mockCreateFileWatcher = jest.fn();
const mockRunInWorker = jest.fn();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
}));

jest.unstable_mockModule('../../../../src/utils/image-renderer.js', () => ({
  default: mockRenderImage,
}));

jest.unstable_mockModule('../../../../src/use-cases/tasks-tree.js', () => ({
  default: mockTasksTreeUseCase,
}));

jest.unstable_mockModule('../../../../src/utils/diagram-viewer.js', () => ({
  default: mockStartDiagramViewer,
}));

jest.unstable_mockModule('../../../../src/utils/file-watcher.js', () => ({
  default: mockCreateFileWatcher,
}));

jest.unstable_mockModule('../../../../src/utils/run-in-worker.js', () => ({
  default: mockRunInWorker,
}));

// Import after mocking
const { default: tasksTreeCommand } = await import('../../../../src/commands/tasks-tree.js');
const { TIME_UNITS } = await import('../../../../src/models.js');

describe('tasksTreeCommand(inputJsonFilepath, outputFolderFilepath, options) -> Promise<void>', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  // Helper to create valid test input data
  const createValidInput = () => ({
    globalParams: {
      timeAndEstimateUnit: TIME_UNITS.WEEKS,
      timeToHireByLevel: { intern: 4, junior: 4, mid: 4, senior: 5, specialist: 6 },
      timeToRampUpByLevel: { intern: 5, junior: 4, mid: 3, senior: 2, specialist: 2 },
      velocityByLevel: { intern: 0.6, junior: 0.9, mid: 1, senior: 1, specialist: 1 },
      reworkRateByLevel: { intern: 0.21, junior: 0.13, mid: 0.08, senior: 0.05, specialist: 0.03 },
      sickRate: 0.000389,
      turnOverRate: 0.00301,
      startDate: '2025-01-01',
      taskSplitRate: 0.15,
      numOfMonteCarloIterations: 1000,
    },
    tasks: [],
    personnel: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockReadFileSync.mockReturnValue(JSON.stringify(createValidInput()));
    mockTasksTreeUseCase.mockReturnValue('flowchart LR\n  A[Start]');
    mockWriteFileSync.mockImplementation(() => {});
    mockRenderImage.mockResolvedValue(undefined);
    mockStartDiagramViewer.mockResolvedValue(undefined);
    mockCreateFileWatcher.mockReturnValue({
      on: jest.fn()
    });
    mockRunInWorker.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('file I/O', () => {
    it('should read JSON file from inputJsonFilepath', async () => {
      const inputPath = '/path/to/input.json';
      const outputPath = '/path/to/output';

      await tasksTreeCommand(inputPath, outputPath);

      expect(mockReadFileSync).toHaveBeenCalledWith(inputPath, 'utf8');
    });

    it('should parse JSON and pass data to use case', async () => {
      const inputData = createValidInput();
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      await tasksTreeCommand('/input.json', '/output');

      expect(mockTasksTreeUseCase).toHaveBeenCalledWith(inputData);
    });

    it('should write mermaid file to output folder', async () => {
      const outputPath = '/path/to/output';
      const mermaidCode = 'flowchart LR\n  A[Start]';
      mockTasksTreeUseCase.mockReturnValue(mermaidCode);

      await tasksTreeCommand('/input.json', outputPath);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        `${outputPath}/tasks-tree.mmd`,
        mermaidCode
      );
    });

    it('should call renderImage with correct parameters', async () => {
      const outputPath = '/path/to/output';

      await tasksTreeCommand('/input.json', outputPath);

      expect(mockRenderImage).toHaveBeenCalledWith(
        `${outputPath}/tasks-tree.mmd`,
        'tasks-tree',
        outputPath
      );
    });
  });

  describe('logging', () => {
    it('should log success message after successful generation', async () => {
      await tasksTreeCommand('/input.json', '/output');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Tasks dependency flowchart generated successfully!'
      );
    });
  });

  describe('error handling', () => {
    it('should catch and log file read errors', async () => {
      const error = new Error('File not found');
      mockReadFileSync.mockImplementation(() => {
        throw error;
      });

      await tasksTreeCommand('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        error
      );
    });

    it('should catch and log JSON parsing errors', async () => {
      mockReadFileSync.mockReturnValue('{ invalid json }');

      await tasksTreeCommand('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        expect.any(Error)
      );
    });

    it('should catch and log use case errors', async () => {
      const error = new Error('Validation failed');
      mockTasksTreeUseCase.mockImplementation(() => {
        throw error;
      });

      await tasksTreeCommand('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        error
      );
    });

    it('should catch and log rendering errors', async () => {
      const error = new Error('Rendering failed');
      mockRenderImage.mockRejectedValue(error);

      await tasksTreeCommand('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        error
      );
    });

    it('should not throw errors to caller', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read failed');
      });

      // Should not throw
      await expect(tasksTreeCommand('/input.json', '/output')).resolves.toBeUndefined();
    });
  });
});
