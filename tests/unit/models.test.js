import { Person, Task, LEVEL, TASK_TYPE, FIBONACCI, getNextFibonacci } from '../../src/models.js';

describe('Person', () => {
  const createPerson = (overrides = {}) => {
    return new Person({
      id: 'p1',
      name: 'Test Person',
      level: LEVEL.MID,
      isHired: true,
      isOnboarded: true,
      ...overrides
    });
  };

  describe('isSick(currentWeek)', () => {
    it('should return false when sickUntilWeek is not set', () => {
      const person = createPerson();
      expect(person.isSick(5)).toBe(false);
    });

    it('should return true when currentWeek is before sickUntilWeek', () => {
      const person = createPerson();
      person.sickUntilWeek = 10;
      expect(person.isSick(5)).toBe(true);
    });

    it('should return true when currentWeek equals sickUntilWeek', () => {
      const person = createPerson();
      person.sickUntilWeek = 10;
      expect(person.isSick(10)).toBe(true);
    });

    it('should return false when currentWeek is after sickUntilWeek', () => {
      const person = createPerson();
      person.sickUntilWeek = 10;
      expect(person.isSick(11)).toBe(false);
    });
  });

  describe('isOnVacation(currentDate)', () => {
    it('should return false when vacationsAt is empty', () => {
      const person = createPerson();
      person.vacationsAt = [];
      expect(person.isOnVacation(new Date('2025-06-15'))).toBe(false);
    });

    it('should return true when currentDate is within a vacation period', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-30') }
      ];
      expect(person.isOnVacation(new Date('2025-06-15'))).toBe(true);
    });

    it('should return true when currentDate equals vacation start date', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-30') }
      ];
      expect(person.isOnVacation(new Date('2025-06-01'))).toBe(true);
    });

    it('should return true when currentDate equals vacation end date', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-30') }
      ];
      expect(person.isOnVacation(new Date('2025-06-30'))).toBe(true);
    });

    it('should return false when currentDate is before vacation period', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-30') }
      ];
      expect(person.isOnVacation(new Date('2025-05-31'))).toBe(false);
    });

    it('should return false when currentDate is after vacation period', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-30') }
      ];
      expect(person.isOnVacation(new Date('2025-07-01'))).toBe(false);
    });

    it('should return true when currentDate matches any vacation period', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-15') },
        { from: new Date('2025-12-20'), to: new Date('2025-12-31') }
      ];
      expect(person.isOnVacation(new Date('2025-12-25'))).toBe(true);
    });

    it('should handle string dates by converting them', () => {
      const person = createPerson();
      person.vacationsAt = [
        { from: new Date('2025-06-01'), to: new Date('2025-06-30') }
      ];
      // Passing string instead of Date object
      expect(person.isOnVacation('2025-06-15')).toBe(true);
    });
  });
});

describe('Task', () => {
  const createTask = (overrides = {}) => {
    return new Task({
      id: 't1',
      title: 'Test Task',
      type: TASK_TYPE.USER_STORY,
      ...overrides
    });
  };

  describe('runtime properties', () => {
    it('should initialize originalDuration as undefined', () => {
      const task = createTask();
      expect(task.originalDuration).toBeUndefined();
    });

    it('should allow setting originalDuration', () => {
      const task = createTask();
      task.originalDuration = 5;
      expect(task.originalDuration).toBe(5);
    });

    it('should initialize remainingNumOfBlocks as undefined', () => {
      const task = createTask();
      expect(task.remainingNumOfBlocks).toBeUndefined();
    });

    it('should allow setting remainingNumOfBlocks', () => {
      const task = createTask();
      task.remainingNumOfBlocks = 3;
      expect(task.remainingNumOfBlocks).toBe(3);
    });
  });
});

describe('getNextFibonacci', () => {
  it('should return 0 for value 0', () => {
    expect(getNextFibonacci(0)).toBe(FIBONACCI._0);
  });

  it('should return 0.5 for value between 0 and 0.5', () => {
    expect(getNextFibonacci(0.3)).toBe(FIBONACCI._0_5);
  });

  it('should return 1 for value between 0.5 and 1', () => {
    expect(getNextFibonacci(0.7)).toBe(FIBONACCI._1);
  });

  it('should return 2 for value between 1 and 2', () => {
    expect(getNextFibonacci(1.5)).toBe(FIBONACCI._2);
  });

  it('should return 3 for value between 2 and 3', () => {
    expect(getNextFibonacci(2.5)).toBe(FIBONACCI._3);
  });

  it('should return 5 for value between 3 and 5', () => {
    expect(getNextFibonacci(4)).toBe(FIBONACCI._5);
  });

  it('should return 8 for value between 5 and 8', () => {
    expect(getNextFibonacci(6)).toBe(FIBONACCI._8);
  });

  it('should return 13 for value between 8 and 13', () => {
    expect(getNextFibonacci(10)).toBe(FIBONACCI._13);
  });

  it('should return exact Fibonacci when value matches', () => {
    expect(getNextFibonacci(5)).toBe(FIBONACCI._5);
    expect(getNextFibonacci(8)).toBe(FIBONACCI._8);
    expect(getNextFibonacci(13)).toBe(FIBONACCI._13);
  });

  it('should return 89 for values up to 89', () => {
    expect(getNextFibonacci(60)).toBe(FIBONACCI._89);
  });

  it('should return 89 for values greater than 89', () => {
    expect(getNextFibonacci(100)).toBe(FIBONACCI._89);
  });
});
