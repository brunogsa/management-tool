import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import {
  LEVEL,
  FIBONACCI,
  TIME_UNITS,
  TASK_TYPE,

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
        default: '',
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

  // TODO: Cant have onboarded=true, if hired=false

  if (!valid) {
    throw new Error(
      JSON.stringify(validate.errors, null, 2),
    );
  }
};

export default inputValidator;
