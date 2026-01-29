import { _getNodeDeclaration } from '../../../../src/utils/mermaid-code-generator.js';
import { Task, TASK_TYPE, TIME_UNITS } from '../../../../src/models.js';

describe('_getNodeDeclaration(task, timeAndEstimateUnit) -> string', () => {
  describe('bracket style based on task type', () => {
    it('should use ">]" brackets for PROJECT type', () => {
      const task = new Task({ id: 'p1', title: 'My Project', type: TASK_TYPE.PROJECT });
      task.totalRealisticEstimate = 50;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('p1>');
      expect(result).toContain(']');
    });

    it('should use "([()])" brackets for MILESTONE type', () => {
      const task = new Task({ id: 'm1', title: 'My Milestone', type: TASK_TYPE.MILESTONE });
      task.totalRealisticEstimate = 30;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('m1([');
      expect(result).toContain('])');
    });

    it('should use "[[]]" brackets for EPIC type', () => {
      const task = new Task({ id: 'e1', title: 'My Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 20;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('e1[[');
      expect(result).toContain(']]');
    });

    it('should use "()" brackets for USER_STORY type', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('us1(');
      expect(result).toContain(')');
      expect(result).not.toContain('us1[[');
      expect(result).not.toContain('us1([');
    });

    it('should use "()" brackets for SPIKE type', () => {
      const task = new Task({ id: 'sp1', title: 'Spike', type: TASK_TYPE.SPIKE });
      task.fibonacciEstimate = 3;
      task.mostProbableEstimateInRange = 2;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('sp1(');
      expect(result).toContain(')');
    });

    it('should use "()" brackets for TECH_TASK type', () => {
      const task = new Task({ id: 'tt1', title: 'Tech Task', type: TASK_TYPE.TECH_TASK });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('tt1(');
      expect(result).toContain(')');
    });

    it('should use "()" brackets for BUG type', () => {
      const task = new Task({ id: 'b1', title: 'Bug Fix', type: TASK_TYPE.BUG });
      task.fibonacciEstimate = 2;
      task.mostProbableEstimateInRange = 1;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('b1(');
      expect(result).toContain(')');
    });
  });

  describe('content for folder-like tasks (PROJECT, MILESTONE, EPIC)', () => {
    it('should display totalRealisticEstimate for PROJECT', () => {
      const task = new Task({ id: 'p1', title: 'My Project', type: TASK_TYPE.PROJECT });
      task.totalRealisticEstimate = 50;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Total: 50 dev-weeks');
    });

    it('should display totalRealisticEstimate for MILESTONE', () => {
      const task = new Task({ id: 'm1', title: 'My Milestone', type: TASK_TYPE.MILESTONE });
      task.totalRealisticEstimate = 30;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Total: 30 dev-weeks');
    });

    it('should display totalRealisticEstimate for EPIC', () => {
      const task = new Task({ id: 'e1', title: 'My Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 20;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Total: 20 dev-weeks');
    });

    it('should not display fibonacciEstimate for folder-like tasks', () => {
      const task = new Task({ id: 'e1', title: 'My Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 20;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).not.toContain('Fibonnaci:');
      expect(result).not.toContain('Realistic:');
    });
  });

  describe('content for leaf tasks (USER_STORY, SPIKE, etc.)', () => {
    it('should display fibonacciEstimate and mostProbableEstimateInRange for USER_STORY', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Fibonnaci: 5 dev-weeks');
      expect(result).toContain('Realistic: 3 dev-weeks');
    });

    it('should display fibonacciEstimate and mostProbableEstimateInRange for SPIKE', () => {
      const task = new Task({ id: 'sp1', title: 'Spike', type: TASK_TYPE.SPIKE });
      task.fibonacciEstimate = 3;
      task.mostProbableEstimateInRange = 2;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Fibonnaci: 3 dev-weeks');
      expect(result).toContain('Realistic: 2 dev-weeks');
    });

    it('should not display totalRealisticEstimate for leaf tasks', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).not.toContain('Total:');
    });
  });

  describe('block count display', () => {
    it('should display "Blocks: N" when totalNumOfBlocks > 0', () => {
      const task = new Task({ id: 'e1', title: 'My Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 20;
      task.totalNumOfBlocks = 5;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Blocks: 5');
    });

    it('should not display blocks line when totalNumOfBlocks is 0', () => {
      const task = new Task({ id: 'e1', title: 'My Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 20;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).not.toContain('Blocks:');
    });

    it('should not display blocks line when totalNumOfBlocks is undefined', () => {
      const task = new Task({ id: 'e1', title: 'My Epic', type: TASK_TYPE.EPIC });
      task.totalRealisticEstimate = 20;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).not.toContain('Blocks:');
    });
  });

  describe('time unit display', () => {
    it('should display time estimates with "dev-days" unit when TIME_UNITS.DAYS', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.DAYS);

      expect(result).toContain('Fibonnaci: 5 dev-days');
      expect(result).toContain('Realistic: 3 dev-days');
    });

    it('should display time estimates with "dev-weeks" unit when TIME_UNITS.WEEKS', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Fibonnaci: 5 dev-weeks');
      expect(result).toContain('Realistic: 3 dev-weeks');
    });

    it('should display time estimates with "dev-days" unit when TIME_UNITS.DAYS', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 8;
      task.mostProbableEstimateInRange = 5;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.DAYS);

      expect(result).toContain('Fibonnaci: 8 dev-days');
      expect(result).toContain('Realistic: 5 dev-days');
    });
  });

  describe('task metadata display', () => {
    it('should include task id as node identifier', () => {
      const task = new Task({ id: 'unique-id-123', title: 'My Task', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('unique-id-123(');
    });

    it('should include task title in node content', () => {
      const task = new Task({ id: 'us1', title: 'Implement User Authentication', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('Implement User Authentication');
    });

    it('should include task type in bold format (__type__)', () => {
      const task = new Task({ id: 'us1', title: 'User Story', type: TASK_TYPE.USER_STORY });
      task.fibonacciEstimate = 5;
      task.mostProbableEstimateInRange = 3;
      task.totalNumOfBlocks = 0;

      const result = _getNodeDeclaration(task, TIME_UNITS.WEEKS);

      expect(result).toContain('__user-story__');
    });
  });
});
