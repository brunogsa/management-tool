import { Person, LEVEL } from '../../../src/models.js';

describe('Person', () => {
  describe('constructor({ id, name, level, isHired, isOnboarded })', () => {
    describe('with valid parameters', () => {
      it('should create person with id, name, level, hired, and onboarded status', () => {
        const person = new Person({
          id: 'p1',
          name: 'Alice',
          level: LEVEL.SENIOR,
          isHired: true,
          isOnboarded: true
        });
        expect(person.id).toBe('p1');
        expect(person.name).toBe('Alice');
        expect(person.level).toBe(LEVEL.SENIOR);
        expect(person.hired).toBe(true);
        expect(person.onboarded).toBe(true);
      });

      it('should initialize skills as empty array', () => {
        const person = new Person({
          id: 'p1',
          name: 'Bob',
          level: LEVEL.MID,
          isHired: true,
          isOnboarded: false
        });
        expect(person.skills).toEqual([]);
        expect(Array.isArray(person.skills)).toBe(true);
      });

      it('should initialize vacationsAt as empty array', () => {
        const person = new Person({
          id: 'p1',
          name: 'Carol',
          level: LEVEL.JUNIOR,
          isHired: false,
          isOnboarded: false
        });
        expect(person.vacationsAt).toEqual([]);
        expect(Array.isArray(person.vacationsAt)).toBe(true);
      });

      describe('runtime properties initialization', () => {
        it('should initialize numOfAssignedTasks as undefined (count of assigned tasks during simulation)', () => {
          const person = new Person({
            id: 'p1',
            name: 'Dave',
            level: LEVEL.INTERN,
            isHired: true,
            isOnboarded: true
          });
          expect(person.numOfAssignedTasks).toBeUndefined();
        });

        it('should initialize availableCapacity as undefined (available work capacity in current sprint)', () => {
          const person = new Person({
            id: 'p1',
            name: 'Eve',
            level: LEVEL.SPECIALIST,
            isHired: true,
            isOnboarded: true
          });
          expect(person.availableCapacity).toBeUndefined();
        });

        it('should initialize remainingReplacementDuration as undefined (time until replacement is hired/onboarded)', () => {
          const person = new Person({
            id: 'p1',
            name: 'Frank',
            level: LEVEL.MID,
            isHired: true,
            isOnboarded: true
          });
          expect(person.remainingReplacementDuration).toBeUndefined();
        });
      });
    });

    describe('with invalid level', () => {
      it('should throw error for invalid level', () => {
        expect(() => {
          new Person({
            id: 'p1',
            name: 'Test',
            level: 'invalid',
            isHired: true,
            isOnboarded: true
          });
        }).toThrow('Unknown level "invalid"');
      });

      it('should throw error for undefined level', () => {
        expect(() => {
          new Person({
            id: 'p1',
            name: 'Test',
            level: undefined,
            isHired: true,
            isOnboarded: true
          });
        }).toThrow('Unknown level "undefined"');
      });

      it('should throw error for null level', () => {
        expect(() => {
          new Person({
            id: 'p1',
            name: 'Test',
            level: null,
            isHired: true,
            isOnboarded: true
          });
        }).toThrow('Unknown level "null"');
      });
    });

    describe('for all valid levels', () => {
      it('should create person for each LEVEL value', () => {
        const levels = Object.values(LEVEL);
        levels.forEach(level => {
          const person = new Person({
            id: 'p1',
            name: 'Test',
            level: level,
            isHired: true,
            isOnboarded: true
          });
          expect(person.level).toBe(level);
        });
      });
    });
  });
});
