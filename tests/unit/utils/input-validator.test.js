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
    it('should throw error for timeAndEstimateUnit not in ["dev-days", "dev-weeks"]', () => {
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
        tasks: [
          {
            id: 'epic1',
            title: 'Epic',
            type: TASK_TYPE.EPIC,
            fibonacciEstimate: 0,
            mostProbableEstimateInRange: 0
          },
          {
            id: 't2',
            title: 'Dependency',
            type: TASK_TYPE.USER_STORY,
            fibonacciEstimate: 3,
            mostProbableEstimateInRange: 2
          },
          {
            id: 't1',
            title: 'Test',
            type: TASK_TYPE.USER_STORY,
            fibonacciEstimate: 5,
            mostProbableEstimateInRange: 3,
            onlyStartableAt: '2025-02-01',
            parents: ['epic1'],
            dependsOnTasks: ['t2'],
            requiredSkills: [{ name: 'JavaScript', minLevel: LEVEL.MID }]
          }
        ],
        personnel: [
          {
            id: 'dev1',
            name: 'Developer',
            level: LEVEL.SENIOR,
            hired: true,
            onboarded: true,
            skills: [{ name: 'JavaScript', minLevel: LEVEL.SENIOR }]
          }
        ]
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

    it('should throw error when task title contains opening parenthesis', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test (with parenthesis',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task title contains closing parenthesis', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test with) parenthesis',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should throw error when task title contains both parentheses', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test (with parentheses)',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).toThrow();
    });

    it('should accept task title without parentheses', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test without parentheses',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should accept task title with dashes instead of parentheses', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Research OAuth 2.0 providers - Google, GitHub, Auth0',
          type: TASK_TYPE.SPIKE,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
        }]
      };
      expect(() => inputValidator(input)).not.toThrow();
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

    it('should throw error when onboarded is true but hired is false', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: false,
          onboarded: true
        }]
      };
      expect(() => inputValidator(input)).toThrow(/onboarded.*hired/i);
    });

    it('should accept personnel with hired=false and onboarded=false', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: false,
          onboarded: false
        }]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should accept personnel with hired=true and onboarded=false', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: true,
          onboarded: false
        }]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });
  });

  describe('task hierarchy validation', () => {
    const createTask = (overrides) => ({
      id: 't1',
      title: 'Test Task',
      type: TASK_TYPE.USER_STORY,
      fibonacciEstimate: 5,
      mostProbableEstimateInRange: 3,
      ...overrides
    });

    it('should throw error when task parent is a user-story', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'parent', type: TASK_TYPE.USER_STORY }),
          createTask({ id: 'child', parents: ['parent'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/parent.*epic.*milestone.*project/i);
    });

    it('should throw error when task parent is a spike', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'parent', type: TASK_TYPE.SPIKE }),
          createTask({ id: 'child', parents: ['parent'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/parent.*epic.*milestone.*project/i);
    });

    it('should throw error when task parent is a tech-task', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'parent', type: TASK_TYPE.TECH_TASK }),
          createTask({ id: 'child', parents: ['parent'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/parent.*epic.*milestone.*project/i);
    });

    it('should throw error when task parent is a bug', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'parent', type: TASK_TYPE.BUG }),
          createTask({ id: 'child', parents: ['parent'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/parent.*epic.*milestone.*project/i);
    });

    it('should accept task with epic as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'epic1', type: TASK_TYPE.EPIC }),
          createTask({ id: 'child', parents: ['epic1'] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should accept task with milestone as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'milestone1', type: TASK_TYPE.MILESTONE }),
          createTask({ id: 'child', parents: ['milestone1'] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should accept task with project as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'project1', type: TASK_TYPE.PROJECT }),
          createTask({ id: 'child', parents: ['project1'] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should throw error when epic has another epic as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'epic1', type: TASK_TYPE.EPIC }),
          createTask({ id: 'epic2', type: TASK_TYPE.EPIC, parents: ['epic1'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/epic.*cannot.*epic.*parent/i);
    });

    it('should accept epic with milestone as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'milestone1', type: TASK_TYPE.MILESTONE }),
          createTask({ id: 'epic1', type: TASK_TYPE.EPIC, parents: ['milestone1'] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should accept epic with project as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'project1', type: TASK_TYPE.PROJECT }),
          createTask({ id: 'epic1', type: TASK_TYPE.EPIC, parents: ['project1'] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should throw error when milestone has epic as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'epic1', type: TASK_TYPE.EPIC }),
          createTask({ id: 'milestone1', type: TASK_TYPE.MILESTONE, parents: ['epic1'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/milestone.*only.*project.*parent/i);
    });

    it('should throw error when milestone has milestone as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'milestone1', type: TASK_TYPE.MILESTONE }),
          createTask({ id: 'milestone2', type: TASK_TYPE.MILESTONE, parents: ['milestone1'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/milestone.*only.*project.*parent/i);
    });

    it('should accept milestone with project as parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'project1', type: TASK_TYPE.PROJECT }),
          createTask({ id: 'milestone1', type: TASK_TYPE.MILESTONE, parents: ['project1'] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should throw error when project has any parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'project1', type: TASK_TYPE.PROJECT }),
          createTask({ id: 'project2', type: TASK_TYPE.PROJECT, parents: ['project1'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/project.*cannot.*parent/i);
    });

    it('should accept project without parent', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'project1', type: TASK_TYPE.PROJECT, parents: [] })
        ]
      };
      expect(() => inputValidator(input)).not.toThrow();
    });

    it('should throw error when parent task does not exist', () => {
      const input = {
        ...validInput,
        tasks: [
          createTask({ id: 'child', parents: ['nonexistent'] })
        ]
      };
      expect(() => inputValidator(input)).toThrow(/parent.*nonexistent.*not found/i);
    });
  });

  describe('default values', () => {
    it('should apply default values to tasks.parents when not provided', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
          // parents not provided
        }]
      };
      inputValidator(input);
      expect(input.tasks[0].parents).toEqual([]);
    });

    it('should apply default values to tasks.dependsOnTasks when not provided', () => {
      const input = {
        ...validInput,
        tasks: [{
          id: 't1',
          title: 'Test',
          type: TASK_TYPE.USER_STORY,
          fibonacciEstimate: 5,
          mostProbableEstimateInRange: 3
          // dependsOnTasks not provided
        }]
      };
      inputValidator(input);
      expect(input.tasks[0].dependsOnTasks).toEqual([]);
    });

    it('should apply default values to personnel.skills when not provided', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: true,
          onboarded: true
          // skills not provided
        }]
      };
      inputValidator(input);
      expect(input.personnel[0].skills).toEqual([]);
    });

    it('should apply default values to personnel.vacationsAt when not provided', () => {
      const input = {
        ...validInput,
        personnel: [{
          id: 'p1',
          name: 'Test',
          level: LEVEL.MID,
          hired: true,
          onboarded: true
          // vacationsAt not provided
        }]
      };
      inputValidator(input);
      expect(input.personnel[0].vacationsAt).toEqual([]);
    });
  });
});
