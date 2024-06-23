const LEVEL = {
  INTERN: 'intern',
  JUNIOR: 'junior',
  MID: 'mid',
  SENIOR: 'senior',
  SPECIALIST: 'specialist',
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

const getEmptyTask = (id, title, type) => {
  return {
    id,
    title,
    type,

    "fibonacciEstimate": 0,
    "mostProbableEstimateInRange": 0,

    "dependsOnTasks": [
    ],

    "requiredSkills": [
    ]
  };
};

export {
  LEVEL,
  TASK_TYPE,
  isFolderLikeTask,
  getEmptyTask,
};
