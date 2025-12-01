import { Task, TASK_TYPE } from '../../../../src/models.js';
import { _highlightOrphanTasks } from '../../../../src/use-cases/tasks-tree.js';

describe('_highlightOrphanTasks(tasks, taskMap) -> void (mutates tasks and taskMap)', () => {
  describe('orphan detection for basic tasks (user stories, bugs, etc.)', () => {
    it('should create "w/o Epic" container when epics exist and basic tasks have no epic parent', () => {
      const epic1 = new Task({ id: 'epic1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      const orphanStory = new Task({ id: 'us1', title: 'Orphan Story', type: TASK_TYPE.USER_STORY });
      orphanStory.parents = [];

      const tasks = [epic1, orphanStory];
      const taskMap = new Map([['epic1', epic1], ['us1', orphanStory]]);

      _highlightOrphanTasks(tasks, taskMap);

      const woEpic = taskMap.get('wo-epic');
      expect(woEpic).toBeDefined();
      expect(woEpic.title).toBe('w/o Epic');
      expect(woEpic.type).toBe(TASK_TYPE.EPIC);
    });

    it('should add orphan basic tasks to "w/o Epic" container as children', () => {
      const epic1 = new Task({ id: 'epic1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      const orphanStory = new Task({ id: 'us1', title: 'Orphan Story', type: TASK_TYPE.USER_STORY });
      orphanStory.parents = [];

      const tasks = [epic1, orphanStory];
      const taskMap = new Map([['epic1', epic1], ['us1', orphanStory]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(orphanStory.parents).toContain('wo-epic');
    });

    it('should not create "w/o Epic" when no epics exist in project', () => {
      const story1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      story1.parents = [];
      const story2 = new Task({ id: 'us2', title: 'Story 2', type: TASK_TYPE.USER_STORY });
      story2.parents = [];

      const tasks = [story1, story2];
      const taskMap = new Map([['us1', story1], ['us2', story2]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.has('wo-epic')).toBe(false);
    });

    it('should not create "w/o Epic" when all basic tasks have epic parents', () => {
      const epic1 = new Task({ id: 'epic1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      const story1 = new Task({ id: 'us1', title: 'Story 1', type: TASK_TYPE.USER_STORY });
      story1.parents = ['epic1'];

      const tasks = [epic1, story1];
      const taskMap = new Map([['epic1', epic1], ['us1', story1]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.has('wo-epic')).toBe(false);
    });
  });

  describe('orphan detection for epics', () => {
    it('should create "w/o Milestone" container when milestones exist and epics have no milestone parent', () => {
      const milestone1 = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      const orphanEpic = new Task({ id: 'epic1', title: 'Orphan Epic', type: TASK_TYPE.EPIC });
      orphanEpic.parents = [];

      const tasks = [milestone1, orphanEpic];
      const taskMap = new Map([['m1', milestone1], ['epic1', orphanEpic]]);

      _highlightOrphanTasks(tasks, taskMap);

      const woMilestone = taskMap.get('wo-milestone');
      expect(woMilestone).toBeDefined();
      expect(woMilestone.title).toBe('w/o Milestone');
      expect(woMilestone.type).toBe(TASK_TYPE.MILESTONE);
    });

    it('should add orphan epics to "w/o Milestone" container as children', () => {
      const milestone1 = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      const orphanEpic = new Task({ id: 'epic1', title: 'Orphan Epic', type: TASK_TYPE.EPIC });
      orphanEpic.parents = [];

      const tasks = [milestone1, orphanEpic];
      const taskMap = new Map([['m1', milestone1], ['epic1', orphanEpic]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(orphanEpic.parents).toContain('wo-milestone');
    });

    it('should not create "w/o Milestone" when no milestones exist', () => {
      const epic1 = new Task({ id: 'epic1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      epic1.parents = [];
      const epic2 = new Task({ id: 'epic2', title: 'Epic 2', type: TASK_TYPE.EPIC });
      epic2.parents = [];

      const tasks = [epic1, epic2];
      const taskMap = new Map([['epic1', epic1], ['epic2', epic2]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.has('wo-milestone')).toBe(false);
    });

    it('should not create "w/o Milestone" when all epics have milestone parents', () => {
      const milestone1 = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      const epic1 = new Task({ id: 'epic1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      epic1.parents = ['m1'];

      const tasks = [milestone1, epic1];
      const taskMap = new Map([['m1', milestone1], ['epic1', epic1]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.has('wo-milestone')).toBe(false);
    });
  });

  describe('orphan detection for milestones', () => {
    it('should create "w/o Project" container when projects exist and milestones have no project parent', () => {
      const project1 = new Task({ id: 'proj1', title: 'Project 1', type: TASK_TYPE.PROJECT });
      const orphanMilestone = new Task({ id: 'm1', title: 'Orphan Milestone', type: TASK_TYPE.MILESTONE });
      orphanMilestone.parents = [];

      const tasks = [project1, orphanMilestone];
      const taskMap = new Map([['proj1', project1], ['m1', orphanMilestone]]);

      _highlightOrphanTasks(tasks, taskMap);

      const woProject = taskMap.get('wo-project');
      expect(woProject).toBeDefined();
      expect(woProject.title).toBe('w/o Project');
      expect(woProject.type).toBe(TASK_TYPE.PROJECT);
    });

    it('should add orphan milestones to "w/o Project" container as children', () => {
      const project1 = new Task({ id: 'proj1', title: 'Project 1', type: TASK_TYPE.PROJECT });
      const orphanMilestone = new Task({ id: 'm1', title: 'Orphan Milestone', type: TASK_TYPE.MILESTONE });
      orphanMilestone.parents = [];

      const tasks = [project1, orphanMilestone];
      const taskMap = new Map([['proj1', project1], ['m1', orphanMilestone]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(orphanMilestone.parents).toContain('wo-project');
    });

    it('should not create "w/o Project" when no projects exist', () => {
      const m1 = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      m1.parents = [];
      const m2 = new Task({ id: 'm2', title: 'Milestone 2', type: TASK_TYPE.MILESTONE });
      m2.parents = [];

      const tasks = [m1, m2];
      const taskMap = new Map([['m1', m1], ['m2', m2]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.has('wo-project')).toBe(false);
    });

    it('should not create "w/o Project" when all milestones have project parents', () => {
      const project1 = new Task({ id: 'proj1', title: 'Project 1', type: TASK_TYPE.PROJECT });
      const m1 = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      m1.parents = ['proj1'];

      const tasks = [project1, m1];
      const taskMap = new Map([['proj1', project1], ['m1', m1]]);

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.has('wo-project')).toBe(false);
    });
  });

  describe('taskMap updates', () => {
    it('should add synthetic "w/o Epic" task to taskMap when created', () => {
      const epic1 = new Task({ id: 'epic1', title: 'Epic 1', type: TASK_TYPE.EPIC });
      const orphanStory = new Task({ id: 'us1', title: 'Orphan Story', type: TASK_TYPE.USER_STORY });
      orphanStory.parents = [];

      const tasks = [epic1, orphanStory];
      const taskMap = new Map([['epic1', epic1], ['us1', orphanStory]]);
      const initialSize = taskMap.size;

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.size).toBe(initialSize + 1);
      expect(taskMap.has('wo-epic')).toBe(true);
    });

    it('should add synthetic "w/o Milestone" task to taskMap when created', () => {
      const milestone1 = new Task({ id: 'm1', title: 'Milestone 1', type: TASK_TYPE.MILESTONE });
      const orphanEpic = new Task({ id: 'epic1', title: 'Orphan Epic', type: TASK_TYPE.EPIC });
      orphanEpic.parents = [];

      const tasks = [milestone1, orphanEpic];
      const taskMap = new Map([['m1', milestone1], ['epic1', orphanEpic]]);
      const initialSize = taskMap.size;

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.size).toBe(initialSize + 1);
      expect(taskMap.has('wo-milestone')).toBe(true);
    });

    it('should add synthetic "w/o Project" task to taskMap when created', () => {
      const project1 = new Task({ id: 'proj1', title: 'Project 1', type: TASK_TYPE.PROJECT });
      const orphanMilestone = new Task({ id: 'm1', title: 'Orphan Milestone', type: TASK_TYPE.MILESTONE });
      orphanMilestone.parents = [];

      const tasks = [project1, orphanMilestone];
      const taskMap = new Map([['proj1', project1], ['m1', orphanMilestone]]);
      const initialSize = taskMap.size;

      _highlightOrphanTasks(tasks, taskMap);

      expect(taskMap.size).toBe(initialSize + 1);
      expect(taskMap.has('wo-project')).toBe(true);
    });
  });
});
