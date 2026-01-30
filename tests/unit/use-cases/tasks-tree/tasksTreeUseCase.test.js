import tasksTreeUseCase from '../../../../src/use-cases/tasks-tree.js';
import { TIME_UNITS, TASK_TYPE } from '../../../../src/models.js';

describe('tasksTreeUseCase(inputData) -> string', () => {
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

  describe('input validation', () => {
    it('should validate input data successfully with valid input', () => {
      const inputData = createValidInput();

      const result = tasksTreeUseCase(inputData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('flowchart LR');
    });

    it('should throw error on validation failure', () => {
      // Create invalid input (missing required fields)
      const invalidInput = {
        globalParams: {},
        tasks: [],
        personnel: [],
      };

      expect(() => tasksTreeUseCase(invalidInput)).toThrow();
    });
  });

  describe('task graph processing', () => {
    it('should process tasks and generate mermaid flowchart', () => {
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

      const result = tasksTreeUseCase(inputData);

      expect(result).toContain('flowchart LR');
      expect(result).toContain('t1');
      expect(result).toContain('Task 1');
    });

    it('should handle orphan tasks by creating synthetic containers', () => {
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

      const result = tasksTreeUseCase(inputData);

      expect(result).toContain('flowchart LR');
      expect(result).toContain('wo-epic');
      expect(result).toContain('w/o Epic');
    });

    it('should aggregate graph information including dependencies', () => {
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

      const result = tasksTreeUseCase(inputData);

      expect(result).toContain('flowchart LR');
      expect(result).toContain('us1');
      expect(result).toContain('us2');
    });
  });

  describe('mermaid code generation', () => {
    it('should return mermaid flowchart code as string', () => {
      const inputData = createValidInput();

      const result = tasksTreeUseCase(inputData);

      expect(typeof result).toBe('string');
      expect(result).toContain('flowchart LR');
    });

    it('should include task information in generated code', () => {
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

      const result = tasksTreeUseCase(inputData);

      expect(result).toContain('t1');
      expect(result).toContain('Test Task');
    });
  });
});
