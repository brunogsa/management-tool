import inputValidator from '../../../src/utils/input-validator.js';
import { TASK_TYPE, LEVEL, TIME_UNITS } from '../../../src/models.js';

describe('inputValidator(inputData) -> void (throws on invalid, silent on valid)', () => {
  const validInput = {
    globalParams: {
      timeAndEstimateUnit: TIME_UNITS.WEEKS,
      timeToHireByLevel: {
        [LEVEL.INTERN]: 4,
        [LEVEL.JUNIOR]: 4,
        [LEVEL.MID]: 4,
        [LEVEL.SENIOR]: 5,
        [LEVEL.SPECIALIST]: 6
      },
      timeToRampUpByLevel: {
        [LEVEL.INTERN]: 5,
        [LEVEL.JUNIOR]: 4,
        [LEVEL.MID]: 3,
        [LEVEL.SENIOR]: 2,
        [LEVEL.SPECIALIST]: 2
      },
      velocityByLevel: {
        [LEVEL.INTERN]: 0.6,
        [LEVEL.JUNIOR]: 0.9,
        [LEVEL.MID]: 1,
        [LEVEL.SENIOR]: 1,
        [LEVEL.SPECIALIST]: 1
      },
      reworkRateByLevel: {
        [LEVEL.INTERN]: 0.21,
        [LEVEL.JUNIOR]: 0.13,
        [LEVEL.MID]: 0.08,
        [LEVEL.SENIOR]: 0.05,
        [LEVEL.SPECIALIST]: 0.03
      },
      sickRate: 0.000389,
      turnOverRate: 0.00301,
      startDate: '2025-01-01',
      taskSplitRate: 0.15,
      numOfMonteCarloIterations: 1000
    },
    tasks: [],
    personnel: []
  };

  describe('with valid input', () => {
    it('should complete silently without errors for complete valid input', () => {
      expect(() => {
        inputValidator(validInput);
      }).not.toThrow();
    });

    it('should complete silently without errors for minimal valid input', () => {
      expect(() => {
        inputValidator({
          ...validInput,
          tasks: [],
          personnel: []
        });
      }).not.toThrow();
    });
  });

  describe('with missing required fields', () => {
    it('should throw error when globalParams is missing', () => {
      const input = { tasks: [], personnel: [] };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when tasks is missing', () => {
      const input = { globalParams: validInput.globalParams, personnel: [] };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel is missing', () => {
      const input = { globalParams: validInput.globalParams, tasks: [] };
      expect(() => inputValidator(input)).toThrow();
    });
  });

  describe('globalParams validation', () => {
    it('should throw error for timeAndEstimateUnit not in ["days", "weeks", "months"]', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, timeAndEstimateUnit: 'invalid' }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when startDate not in YYYY-MM-DD format', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, startDate: '01/01/2025' }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when timeToHireByLevel has value less than 2', () => {
      const input = {
        ...validInput,
        globalParams: {
          ...validInput.globalParams,
          timeToHireByLevel: { ...validInput.globalParams.timeToHireByLevel, [LEVEL.INTERN]: 1 }
        }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when timeToRampUpByLevel has value less than 1', () => {
      const input = {
        ...validInput,
        globalParams: {
          ...validInput.globalParams,
          timeToRampUpByLevel: { ...validInput.globalParams.timeToRampUpByLevel, [LEVEL.JUNIOR]: 0 }
        }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when velocityByLevel has value less than 0', () => {
      const input = {
        ...validInput,
        globalParams: {
          ...validInput.globalParams,
          velocityByLevel: { ...validInput.globalParams.velocityByLevel, [LEVEL.MID]: -0.1 }
        }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when velocityByLevel has value greater than 2', () => {
      const input = {
        ...validInput,
        globalParams: {
          ...validInput.globalParams,
          velocityByLevel: { ...validInput.globalParams.velocityByLevel, [LEVEL.SENIOR]: 2.1 }
        }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when reworkRateByLevel has value less than 0', () => {
      const input = {
        ...validInput,
        globalParams: {
          ...validInput.globalParams,
          reworkRateByLevel: { ...validInput.globalParams.reworkRateByLevel, [LEVEL.SPECIALIST]: -0.01 }
        }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when reworkRateByLevel has value greater than 1', () => {
      const input = {
        ...validInput,
        globalParams: {
          ...validInput.globalParams,
          reworkRateByLevel: { ...validInput.globalParams.reworkRateByLevel, [LEVEL.INTERN]: 1.01 }
        }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when sickRate is less than 0', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, sickRate: -0.01 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when sickRate is greater than 1', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, sickRate: 1.01 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when turnOverRate is less than 0', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, turnOverRate: -0.01 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when turnOverRate is greater than 1', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, turnOverRate: 1.01 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when taskSplitRate is less than 0', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, taskSplitRate: -0.01 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when taskSplitRate is greater than 1', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, taskSplitRate: 1.01 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when numOfMonteCarloIterations is less than 10', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, numOfMonteCarloIterations: 9 }
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when numOfMonteCarloIterations is not an integer', () => {
      const input = {
        ...validInput,
        globalParams: { ...validInput.globalParams, numOfMonteCarloIterations: 100.5 }
      };
      expect(() => inputValidator(input)).toThrow();
    });
  });

  describe('tasks validation', () => {
    it('should accept empty tasks array as valid', () => {
      expect(() => {
        inputValidator({ ...validInput, tasks: [] });
      }).not.toThrow();
    });

    it('should throw error for type not in TASK_TYPE enum', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: 'invalid-type',
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task is missing required field: id', () => {
      const input = {
        ...validInput,
        tasks: [{
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task is missing required field: title', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task is missing required field: type', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task is missing required field: fibonacciEstimate', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task is missing required field: mostProbableEstimateInRange', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when fibonacciEstimate is not in FIBONACCI enum', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 4,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when mostProbableEstimateInRange is less than 0', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: -1
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when mostProbableEstimateInRange is greater than 89', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 90
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when onlyStartableAt is not in YYYY-MM-DD format', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          onlyStartableAt: '01/01/2025'
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should accept valid task with all optional fields', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          onlyStartableAt: '2025-02-01',
          parents: ['epic1'],
          dependsOnTasks: ['t2'],
          requiredSkills: [{ name: 'JavaScript', minLevel: LEVEL.MID }]
        }]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should throw error when requiredSkills has invalid skill minLevel', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3,
          requiredSkills: [{ name: 'JavaScript', minLevel: 'invalid-level' }]
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });
  });

  describe('personnel validation', () => {
    it('should accept empty personnel array as valid', () => {
      expect(() => {
        inputValidator({ ...validInput, personnel: [] });
      }).not.toThrow();
    });

    it('should throw error for level not in LEVEL enum', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: 'invalid-level',
          hired: true,
          onboarded: true,
          skills: []
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel is missing required field: id', () => {
      const input = {
        ...validInput,
        personnel: [{
          name: 'Test',
          level: LEVEL.MID,
          hired: true,
          onboarded: true
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel is missing required field: name', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          level: LEVEL.MID,
          hired: true,
          onboarded: true
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel is missing required field: level', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          hired: true,
          onboarded: true
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel is missing required field: hired', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          onboarded: true
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel is missing required field: onboarded', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: true
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should accept valid personnel with skills and vacations', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test Developer',
          level: LEVEL.SENIOR,
          hired: true,
          onboarded: true,
          skills: [{ name: 'JavaScript', minLevel: LEVEL.SENIOR }],
          vacationsAt: [{ from: '2025-06-01', to: '2025-06-15' }]
        }]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should throw error when vacation date is not in YYYY-MM-DD format', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: true,
          onboarded: true,
          vacationsAt: [{ from: '06/01/2025', to: '2025-06-15' }]
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when personnel skill has invalid minLevel', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: true,
          onboarded: true,
          skills: [{ name: 'JavaScript', minLevel: 'invalid-level' }]
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });
  });
});
