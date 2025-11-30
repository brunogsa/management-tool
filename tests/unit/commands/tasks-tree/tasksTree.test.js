import { jest } from '@jest/globals';

// Only mock external dependencies (file I/O and rendering)
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockRenderImage = jest.fn();
const mockWatch = jest.fn();
const mockExpress = jest.fn();
const mockOpen = jest.fn();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

jest.unstable_mockModule('chokidar', () => ({
  watch: mockWatch,
}));

jest.unstable_mockModule('express', () => ({
  default: mockExpress,
}));

jest.unstable_mockModule('open', () => ({
  default: mockOpen,
}));

jest.unstable_mockModule('../../../../src/utils/image-renderer.js', () => ({
  default: mockRenderImage,
}));

// Import after mocking
const { default: tasksTree } = await import('../../../../src/commands/tasks-tree.js');
const { TIME_UNITS, TASK_TYPE } = await import('../../../../src/models.js');

describe('tasksTree(inputJsonFilepath, outputFolderFilepath) -> Promise<void>', () => {
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
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Setup default mock implementations for external dependencies only
    mockReadFileSync.mockReturnValue(JSON.stringify(createValidInput()));
    mockWriteFileSync.mockImplementation(() => {});
    mockRenderImage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('input validation and parsing', () => {
    it('should read and parse JSON file from inputJsonFilepath', async () => {
      const inputPath = '/path/to/input.json';
      const outputPath = '/path/to/output';

      await tasksTree(inputPath, outputPath);

      expect(mockReadFileSync).toHaveBeenCalledWith(inputPath, 'utf8');
    });

    it('should validate input data successfully with valid input', async () => {
      const inputData = createValidInput();
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      // Should complete without throwing (validation passes)
      await expect(tasksTree('/input.json', '/output')).resolves.toBeUndefined();

      // Should log success message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Tasks dependency flowchart generated successfully!'
      );
    });

    it('should handle invalid JSON gracefully and log error', async () => {
      mockReadFileSync.mockReturnValue('{ invalid json }');

      await tasksTree('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        expect.any(Error)
      );
    });

    it('should handle validation errors gracefully and log error', async () => {
      // Create invalid input (missing required fields)
      const invalidInput = {
        globalParams: {},
        tasks: [],
        personnel: [],
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(invalidInput));

      await tasksTree('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        expect.any(Error)
      );
    });
  });

  describe('task graph processing', () => {
    it('should process tasks and create proper graph structure', async () => {
      const inputData = createValidInput();
      inputData.tasks = [
        {
          id: 't1',
          title: 'Task 1',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          parents: [],
          dependsOnTasks: [],
        },
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      // Should process successfully
      await expect(tasksTree('/input.json', '/output')).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Tasks dependency flowchart generated successfully!'
      );
    });

    it('should handle orphan tasks by creating synthetic containers', async () => {
      const inputData = createValidInput();
      // Create an epic and an orphan story (no epic parent)
      inputData.tasks = [
        {
          id: 'epic1',
          title: 'Epic 1',
          type: TASK_TYPE.EPIC,
          fibonacciEstimate: 0,
          mostProbableEstimateInRange: 0,
          parents: [],
          dependsOnTasks: [],
        },
        {
          id: 'us1',
          title: 'Orphan Story',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          parents: [], // No epic parent - should be highlighted as orphan
          dependsOnTasks: [],
        },
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      // Should process successfully with orphan handling
      await expect(tasksTree('/input.json', '/output')).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Tasks dependency flowchart generated successfully!'
      );
    });

    it('should aggregate graph information including dependencies', async () => {
      const inputData = createValidInput();
      inputData.tasks = [
        {
          id: 'epic1',
          title: 'Epic 1',
          type: TASK_TYPE.EPIC,
          fibonacciEstimate: 0,
          mostProbableEstimateInRange: 0,
          parents: [],
          dependsOnTasks: [],
        },
        {
          id: 'us1',
          title: 'Story 1',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          parents: ['epic1'],
          dependsOnTasks: ['us2'],
        },
        {
          id: 'us2',
          title: 'Story 2',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 3,
          mostProbableEstimateInRange: 2,
          parents: ['epic1'],
          dependsOnTasks: [],
        },
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      // Should process successfully with dependencies
      await expect(tasksTree('/input.json', '/output')).resolves.toBeUndefined();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Tasks dependency flowchart generated successfully!'
      );
    });
  });

  describe('diagram generation', () => {
    it('should generate and write mermaid flowchart code', async () => {
      const outputPath = '/path/to/output';
      const inputData = createValidInput();
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      await tasksTree('/input.json', outputPath);

      // Verify .mmd file was written
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        `${outputPath}/tasks-tree.mmd`,
        expect.stringContaining('flowchart TB')
      );
    });

    it('should write mermaid code with actual task content', async () => {
      const outputPath = '/path/to/output';
      const inputData = createValidInput();
      inputData.tasks = [
        {
          id: 't1',
          title: 'Test Task',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          parents: [],
          dependsOnTasks: [],
        },
      ];
      mockReadFileSync.mockReturnValue(JSON.stringify(inputData));

      await tasksTree('/input.json', outputPath);

      // Verify mermaid code contains task information
      const writtenContent = mockWriteFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('t1');
      expect(writtenContent).toContain('Test Task');
    });

    it('should call renderImage to generate diagram image', async () => {
      const outputPath = '/path/to/output';
      const expectedDiagramPath = `${outputPath}/tasks-tree.mmd`;

      await tasksTree('/input.json', outputPath);

      expect(mockRenderImage).toHaveBeenCalledWith(
        expectedDiagramPath,
        'tasks-tree',
        outputPath
      );
    });

    it('should log success message when complete', async () => {
      await tasksTree('/input.json', '/output');

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

      await tasksTree('/input.json', '/output');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate tasks tree:',
        error
      );
    });

    it('should catch and log rendering errors', async () => {
      const error = new Error('Rendering failed');
      mockRenderImage.mockRejectedValue(error);

      await tasksTree('/input.json', '/output');

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
      await expect(tasksTree('/input.json', '/output')).resolves.toBeUndefined();
    });
  });
});
