import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { LEVEL, TASK_TYPE } from '../models.js';

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
      'level',
    ],
    properties: {
      name: { type: 'string' },
      level: {
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
        enum: [0, 0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
      },
      mostProbableEstimateInRange: {
        type: 'integer',
        minimum: 0,
        maximum: 89,
      },
      onlyStartableAt: {
        type: 'string',
        format: 'date',
        default: '',
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
      'level',
    ],
    properties: {
      id: {
        type: 'string',
      },
      name: {
        type: 'string',
        default: '',
      },
      level: {
        $ref: '#/$defs/Level',
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
          'days',
          'weeks',
          'months',
        ],
      },

      timeToHireByLevel: {
        type: 'object',
        properties: {
          intern: {
            type: 'integer',
            minimum: 0,
          },
          junior: {
            type: 'integer',
            minimum: 0,
          },
          mid: {
            type: 'integer',
            minimum: 0,
          },
          senior: {
            type: 'integer',
            minimum: 0,
          },
          specialist: {
            type: 'integer',
            minimum: 0,
          },
        },
      },

      timeToRampUpByLevel: {
        type: 'object',
        properties: {
          intern: {
            type: 'integer',
            minimum: 0,
          },
          junior: {
            type: 'integer',
            minimum: 0,
          },
          mid: {
            type: 'integer',
            minimum: 0,
          },
          senior: {
            type: 'integer',
            minimum: 0,
          },
          specialist: {
            type: 'integer',
            minimum: 0,
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
          },
          junior: {
            type: 'number',
            minimum: 0,
            maximum: 2,
          },
          mid: {
            type: 'number',
            minimum: 0,
            maximum: 2,
          },
          senior: {
            type: 'number',
            minimum: 0,
            maximum: 2,
          },
          specialist: {
            type: 'number',
            minimum: 0,
            maximum: 2,
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
          },
          junior: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          mid: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          senior: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          specialist: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },
      },

      sickRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },
      turnOverRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },

      startDate: {
        type: 'string',
        format: 'date',
      },
      taskSplitRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },

      numOfMonteCarloIterations: {
        type: 'integer',
        minimum: 1000000,
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

const inputValidator = (inputData) => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  // TODO: Ensure default values are aggregated

  const validate = ajv.compile(jsonSchema);
  const valid = validate(inputData);

  // TODO: A parent should either be an epic, milestone or project
  // TODO: An epic cant have another epic as parent
  // TODO: A milestone can only have a project as a parent
  // TODO: A project can never have a parent

  if (!valid) {
    throw new Error(
      JSON.stringify(validate.errors, null, 2),
    );
  }
};

export default inputValidator;
