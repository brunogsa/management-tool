import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import {
  LEVEL,
  LEVEL_RANK,
  FIBONACCI,
  TIME_UNITS,
  TASK_TYPE,
  isContainerTask,

  DEFAULT_WEEKLY_SICK_CHANCE,
  DEFAULT_WEEKLY_QUIT_CHANCE,

  DEFAULT_TIME_TO_HIRE,
  DEFAULT_TIME_TO_RAMPUP,
  DEFAULT_VELOCITY_RATE,
  DEFAULT_REWORK_RATE,

  DEFAULT_TASK_SPLIT_RATE,

  DEFAULT_NUM_OF_MONTE_CARLO_SIMULATIONS,
} from '../models.js';

const definitions = {
  Level: {
    type: 'string',
    enum: [
      LEVEL.INTERN,
      LEVEL.JUNIOR,
      LEVEL.MID,
      LEVEL.SENIOR,
      LEVEL.SPECIALIST,
    ],
  },

  Skill: {
    type: 'object',
    required: [
      'name',
      'minLevel',
    ],
    properties: {
      name: { type: 'string' },
      minLevel: {
        $ref: '#/$defs/Level',
      }
    }
  },

  Task: {
    type: 'object',
    required: [
      'id',
      'title',
      'type',
      'fibonacciEstimate',
      'mostProbableEstimateInRange',
    ],
    properties: {
      id: {
        type: 'string',
      },
      title: {
        type: 'string',
        pattern: '^[^()]*$',
      },
      type: {
        type: 'string',
        enum: [
          TASK_TYPE.PROJECT,
          TASK_TYPE.MILESTONE,
          TASK_TYPE.EPIC,
          TASK_TYPE.USER_STORY,
          TASK_TYPE.SPIKE,
          TASK_TYPE.TECH_TASK,
          TASK_TYPE.TECH_DEBT,
          TASK_TYPE.IMPROVEMENT,
          TASK_TYPE.BUG,
        ],
      },
      fibonacciEstimate: {
        type: 'number',
        enum: [
          FIBONACCI._0,
          FIBONACCI._0_5,
          FIBONACCI._1,
          FIBONACCI._2,
          FIBONACCI._3,
          FIBONACCI._5,
          FIBONACCI._8,
          FIBONACCI._13,
          FIBONACCI._21,
          FIBONACCI._34,
          FIBONACCI._55,
          FIBONACCI._89,
        ],
      },
      mostProbableEstimateInRange: {
        type: 'number',
        minimum: FIBONACCI._0,
        maximum: FIBONACCI._89,
      },
      onlyStartableAt: {
        type: 'string',
        format: 'date',
      },
      parents: {
        type: 'array',
        items: { type: 'string' },
        default: [],
      },
      dependsOnTasks: {
        type: 'array',
        items: { type: 'string' },
        default: [],
      },
      requiredSkills: {
        type: 'array',
        items: {
          $ref: '#/$defs/Skill',
        },
      },
    }
  },

  Personnel: {
    type: 'object',
    required: [
      'id',
      'name',
      'level',
      'hired',
      'onboarded',
    ],
    properties: {
      id: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      level: {
        $ref: '#/$defs/Level',
      },
      hired: {
        type: 'boolean',
      },
      onboarded: {
        type: 'boolean',
      },
      skills: {
        type: 'array',
        items: {
          $ref: '#/$defs/Skill',
        },
        default: [],
      },
      vacationsAt: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              format: 'date',
            },
            to: {
              type: 'string',
              format: 'date',
            }
          },
        },
        default: [],
      },
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Date when person becomes available (will go through hiring and onboarding from this date)',
      }
    }
  },

  GlobalParams: {
    type: 'object',
    required: [
      'timeAndEstimateUnit',
      'timeToHireByLevel',
      'timeToRampUpByLevel',
      'velocityByLevel',
      'reworkRateByLevel',
      'sickRate',
      'turnOverRate',
      'startDate',
      'taskSplitRate',
      'numOfMonteCarloIterations',
    ],
    properties: {
      timeAndEstimateUnit: {
        type: 'string',
        enum: [
          TIME_UNITS.DAYS,
          TIME_UNITS.WEEKS,
          TIME_UNITS.MONTHS,
        ],
        default: TIME_UNITS.WEEKS,
      },

      timeToHireByLevel: {
        type: 'object',
        properties: {
          intern: {
            type: 'integer',
            minimum: 2,
            default: DEFAULT_TIME_TO_HIRE.INTERN,
          },
          junior: {
            type: 'integer',


            minimum: 2,
            default: DEFAULT_TIME_TO_HIRE.JUNIOR,
          },
          mid: {
            type: 'integer',
            minimum: 2,
            default: DEFAULT_TIME_TO_HIRE.MID,
          },
          senior: {
            type: 'integer',
            minimum: 2,
            default: DEFAULT_TIME_TO_HIRE.SENIOR,
          },
          specialist: {
            type: 'integer',
            minimum: 2,
            default: DEFAULT_TIME_TO_HIRE.SPECIALIST,
          },
        },
      },

      timeToRampUpByLevel: {
        type: 'object',
        properties: {
          intern: {
            type: 'integer',
            minimum: 1,
            default: DEFAULT_TIME_TO_RAMPUP.INTERN,
          },
          junior: {
            type: 'integer',
            minimum: 1,
            default: DEFAULT_TIME_TO_RAMPUP.JUNIOR,
          },
          mid: {
            type: 'integer',
            minimum: 1,
            default: DEFAULT_TIME_TO_RAMPUP.MID,
          },
          senior: {
            type: 'integer',
            minimum: 1,
            default: DEFAULT_TIME_TO_RAMPUP.SENIOR,
          },
          specialist: {
            type: 'integer',
            minimum: 1,
            default: DEFAULT_TIME_TO_RAMPUP.SPECIALIST,
          },
        },
      },

      velocityByLevel: {
        type: 'object',
        properties: {
          intern: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            default: DEFAULT_VELOCITY_RATE.INTERN,
          },
          junior: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            default: DEFAULT_VELOCITY_RATE.JUNIOR,
          },
          mid: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            default: DEFAULT_VELOCITY_RATE.MID,
          },
          senior: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            default: DEFAULT_VELOCITY_RATE.SENIOR,
          },
          specialist: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            default: DEFAULT_VELOCITY_RATE.SPECIALIST,
          },
        },
      },

      reworkRateByLevel: {
        type: 'object',
        properties: {
          intern: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: DEFAULT_REWORK_RATE.INTERN,
          },
          junior: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: DEFAULT_REWORK_RATE.JUNIOR,
          },
          mid: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: DEFAULT_REWORK_RATE.MID,
          },
          senior: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: DEFAULT_REWORK_RATE.SENIOR,
          },
          specialist: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: DEFAULT_REWORK_RATE.SPECIALIST,
          },
        },
      },

      sickRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: DEFAULT_WEEKLY_SICK_CHANCE,
      },
      turnOverRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: DEFAULT_WEEKLY_QUIT_CHANCE,
      },

      startDate: {
        type: 'string',
        format: 'date',
      },
      taskSplitRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: DEFAULT_TASK_SPLIT_RATE,
      },

      numOfMonteCarloIterations: {
        type: 'integer',
        // minimum: 100000,
        minimum: 10,
        default: DEFAULT_NUM_OF_MONTE_CARLO_SIMULATIONS,
      }
    }
  }
};

const jsonSchema = {
  $defs: definitions,

  type: 'object',
  properties: {
    globalParams: definitions.GlobalParams,
    tasks: {
      type: 'array',
      items: definitions.Task
    },
    personnel: {
      type: 'array',
      items: definitions.Personnel
    }
  },
  required: [
    'globalParams',
    'tasks',
    'personnel',
  ]
};

const _validatePersonnelState = (personnel) => {
  for (const person of personnel) {
    if (person.onboarded && !person.hired) {
      throw new Error(
        `Personnel "${person.id}" cannot be onboarded if not hired`
      );
    }
  }
};

const _validateTaskEstimates = (tasks) => {
  for (const task of tasks) {
    if (isContainerTask(task.type)) {
      continue;
    }

    if (task.fibonacciEstimate === 0 || task.mostProbableEstimateInRange === 0) {
      throw new Error(
        `Task "${task.id}" has zero estimate. Leaf tasks must have non-zero estimates.`
      );
    }
  }
};

const _validateTaskHierarchy = (tasks) => {
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  for (const task of tasks) {
    const parents = task.parents || [];

    for (const parentId of parents) {
      const parentTask = taskMap.get(parentId);

      if (!parentTask) {
        throw new Error(
          `Task "${task.id}" has parent "${parentId}" which was not found in tasks`
        );
      }

      // A parent should be an epic, milestone, or project
      if (!isContainerTask(parentTask.type)) {
        throw new Error(
          'Task "' + task.id + '" has parent "' + parentId + '" of type "' + parentTask.type + '". ' +
          'A parent must be an epic, milestone, or project'
        );
      }

      // An epic cannot have another epic as parent
      if (task.type === TASK_TYPE.EPIC && parentTask.type === TASK_TYPE.EPIC) {
        throw new Error(
          `Epic "${task.id}" cannot have another epic as parent`
        );
      }

      // A milestone can only have a project as parent
      if (task.type === TASK_TYPE.MILESTONE && parentTask.type !== TASK_TYPE.PROJECT) {
        throw new Error(
          `Milestone "${task.id}" can only have a project as parent, ` +
          `but has "${parentId}" of type "${parentTask.type}"`
        );
      }
    }

    // A project can never have a parent
    if (task.type === TASK_TYPE.PROJECT && parents.length > 0) {
      throw new Error(
        `Project "${task.id}" cannot have a parent`
      );
    }
  }
};

const _validateNoCircularDependencies = (tasks) => {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set();
  const recursionStack = new Set();

  const hasCycle = (taskId, path = []) => {
    if (recursionStack.has(taskId)) {
      const cycleStart = path.indexOf(taskId);
      const cycle = [...path.slice(cycleStart), taskId];
      throw new Error(
        `Circular dependency detected: ${cycle.join(' -> ')}`
      );
    }

    if (visited.has(taskId)) {
      return false;
    }

    const task = taskMap.get(taskId);
    if (!task) {
      return false;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const dependencies = task.dependsOnTasks || [];
    for (const depId of dependencies) {
      hasCycle(depId, [...path, taskId]);
    }

    recursionStack.delete(taskId);
    return false;
  };

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      hasCycle(task.id);
    }
  }
};

const _levelMeetsRequirement = (personLevel, requiredLevel) => {
  return LEVEL_RANK[personLevel] >= LEVEL_RANK[requiredLevel];
};

const _validateTasksHaveQualifiedPersonnel = (tasks, personnel) => {
  for (const task of tasks) {
    if (isContainerTask(task.type)) {
      continue;
    }

    const requiredSkills = task.requiredSkills || [];
    if (requiredSkills.length === 0) {
      continue;
    }

    const hasQualifiedPerson = personnel.some(person => {
      const personSkills = person.skills || [];
      return requiredSkills.every(requiredSkill => {
        return personSkills.some(personSkill =>
          personSkill.name === requiredSkill.name &&
          _levelMeetsRequirement(personSkill.minLevel, requiredSkill.minLevel)
        );
      });
    });

    if (!hasQualifiedPerson) {
      const skillsDesc = requiredSkills.map(s => `${s.name} (${s.minLevel}+)`).join(', ');
      throw new Error(
        `Task "${task.id}" requires skills [${skillsDesc}] but no personnel can fulfill all requirements`
      );
    }
  }
};

const inputValidator = (inputData) => {
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);

  const validate = ajv.compile(jsonSchema);
  const valid = validate(inputData);

  if (!valid) {
    throw new Error(
      JSON.stringify(validate.errors, null, 2),
    );
  }

  // Custom validations after AJV schema validation
  _validatePersonnelState(inputData.personnel);
  _validateTaskEstimates(inputData.tasks);
  _validateTaskHierarchy(inputData.tasks);
  _validateNoCircularDependencies(inputData.tasks);
  _validateTasksHaveQualifiedPersonnel(inputData.tasks, inputData.personnel);
};

export default inputValidator;
