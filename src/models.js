const LEVEL = {
  INTERN: 'intern',
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  SPECIALIST: 'specialist',
};

const FIBONACCI = {
  _0: 0,
  _0_5: 0.5,
  _1: 1,
  _2: 2,
  _3: 3,
  _5: 5,
  _8: 8,
  _13: 13,
  _21: 21,
  _34: 34,
  _55: 55,
  _89: 89,
};

const TIME_UNITS = {
  DAYS: 'days',
  WEEKS: 'weeks',
  MONTHS: 'months',
};

const TASK_TYPE = {
  PROJECT: 'project',
  MILESTONE: 'milestone',
  EPIC: 'epic',
  USER_STORY: 'user-story',
  SPIKE: 'spike',
  TECH_TASK: 'tech-task',
  TECH_DEBT: 'tech-debt',
  IMPROVEMENT: 'improvement',
  BUG: 'bug',
};

const isFolderLikeTask = (taskType) => {
  return [
    TASK_TYPE.PROJECT,
    TASK_TYPE.MILESTONE,
    TASK_TYPE.EPIC,
  ].includes(taskType);
};

class Task {
  constructor({ id, title, type }) {
    if (!TASK_TYPE.includes(type)) {
       throw new Error(`Unknown type "${type}". Must be one of: ${JSON.stringify(TASK_TYPE)}`);
    }

    this.id = id;
    this.title = title;
    this.type = type;

    this.fibonacciEstimate = FIBONACCI._0;
    this.mostProbableEstimateInRange = FIBONACCI._0;

    // TaskId[]
    this.parents = [];

    // TaskId[]
    this.dependsOnTasks = [];

    // Skill[]
    this.requiredSkills = [];

    // Other optional props

    // Undefined | Date
    this.onlyStartableAt = undefined;

    // Props agreggated during runtime

    // Undefined | TaskId[]
    this.children = undefined;
    this.cummulativeChildTasks = undefined;
    this.tasksBeingBlocked = undefined;
    this.cummulativeTasksBeingBlocked = undefined;
    this.blocking = undefined;

    // Undefined | Number
    this.totalRealisticEstimate = undefined;
    this.totalNumOfBlocks = undefined;
    this.remainingDuration = undefined;
    this.remainingReworkDuration = undefined;

    // Undefined | PersonId
    this.assignee = undefined;
  }

  accountWork(spentDuration, reworkRateToConsider) {
    if (this.remainingDuration === undefined) {
      this.remainingDuration = 0;
    }
    if (this.remainingReworkDuration === undefined) {
      this.remainingReworkDuration = 0;
    }

    if (this.remainingDuration >= spentDuration) {
      this.remainingDuration -= spentDuration;
      this.remainingReworkDuration += spentDuration *  reworkRateToConsider;

      return;
    }

    const spentAux = this.remainingDuration;
    this.remainingDuration = 0;
    this.remainingReworkDuration += spentAux *  reworkRateToConsider;

    // Then, consume the remaining from the rework itself
  }

  isDone() {
    return (
      this.remainingDuration <= 0
      && this.remainingReworkDuration <= 0
    );
  }
};

class Skill {
  constructor({ name, level }) {
    if (!LEVEL.includes(level)) {
       throw new Error(`Unknown level "${level}". Must be one of: ${JSON.stringify(LEVEL)}`);
    }

    this.name = name;
    this.level = level;
  }
}

class Vacation {
  constructor({ from, to }) {
    this.from = new Date(from);
    this.to = new Date(to);
  }
}

class Person {
  constructor({ id, name, level, isHired, isOnboarded }) {
    if (!LEVEL.includes(level)) {
       throw new Error(`Unknown level "${level}". Must be one of: ${JSON.stringify(LEVEL)}`);
    }

    this.id = id;
    this.name = name;
    this.level = level;

    this.hired = isHired;
    this.onboarded = isOnboarded;

    // Skill[]
    this.skills = [];

    // Vacation[]
    this.vacationsAt = [];

    // Props agreggated during runtime

    // Undefined | Number
    this.numOfAssignedTasks = undefined;
    this.remainingCapacity = undefined;
    this.remainingRehiringDuration = undefined;
  }
};

const DEFAULT_WEEKLY_SICK_CHANCE = 0.000389; // 0.0389%
const DEFAULT_WEEKLY_QUIT_CHANCE = 0.00301; // 0.301%

const DEFAULT_TIME_TO_HIRE = {
  [LEVEL.INTERN]: 4,
  [LEVEL.JUNIOR]: 4,
  [LEVEL.MID]: 4,
  [LEVEL.SENIOR]: 5,
  [LEVEL.SPECIALIST]: 6,
};

const DEFAULT_TIME_TO_RAMPUP = {
  [LEVEL.INTERN]: 5,
  [LEVEL.JUNIOR]: 4,
  [LEVEL.MID]: 3,
  [LEVEL.SENIOR]: 2,
  [LEVEL.SPECIALIST]: 1,
};

const DEFAULT_VELOCITY_RATE = {
  [LEVEL.INTERN]: 0.6,
  [LEVEL.JUNIOR]: 0.9,
  [LEVEL.MID]: 1.1,
  [LEVEL.SENIOR]: 1,
  [LEVEL.SPECIALIST]: 1,
};

const DEFAULT_REWORK_RATE = {
  [LEVEL.INTERN]: 0.21,
  [LEVEL.JUNIOR]: 0.13,
  [LEVEL.MID]: 0.08,
  [LEVEL.SENIOR]: 0.05,
  [LEVEL.SPECIALIST]: 0.03,
};

const DEFAULT_TASK_SPLIT_RATE = 0.15;

const DEFAULT_NUM_OF_MONTE_CARLO_SIMULATIONS = 1000000;

export {
  LEVEL,
  FIBONACCI,
  TIME_UNITS,

  TASK_TYPE,
  isFolderLikeTask,

  Task,
  Skill,
  Vacation,
  Person,

  DEFAULT_WEEKLY_SICK_CHANCE,
  DEFAULT_WEEKLY_QUIT_CHANCE,

  DEFAULT_TIME_TO_HIRE,
  DEFAULT_TIME_TO_RAMPUP,
  DEFAULT_VELOCITY_RATE,
  DEFAULT_REWORK_RATE,

  DEFAULT_TASK_SPLIT_RATE,

  DEFAULT_NUM_OF_MONTE_CARLO_SIMULATIONS,
};
