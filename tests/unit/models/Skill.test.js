import { Skill, LEVEL } from '../../../src/models.js';

describe('Skill', () => {
  describe('constructor({ name, level })', () => {
    describe('with valid parameters', () => {
      it('should create skill with name and level for LEVEL.INTERN', () => {
        const skill = new Skill({ name: 'backend', level: LEVEL.INTERN });
        expect(skill.name).toBe('backend');
        expect(skill.level).toBe(LEVEL.INTERN);
      });

      it('should create skill with name and level for LEVEL.JUNIOR', () => {
        const skill = new Skill({ name: 'frontend', level: LEVEL.JUNIOR });
        expect(skill.name).toBe('frontend');
        expect(skill.level).toBe(LEVEL.JUNIOR);
      });

      it('should create skill with name and level for LEVEL.MID', () => {
        const skill = new Skill({ name: 'fullstack', level: LEVEL.MID });
        expect(skill.name).toBe('fullstack');
        expect(skill.level).toBe(LEVEL.MID);
      });

      it('should create skill with name and level for LEVEL.SENIOR', () => {
        const skill = new Skill({ name: 'backend', level: LEVEL.SENIOR });
        expect(skill.name).toBe('backend');
        expect(skill.level).toBe(LEVEL.SENIOR);
      });

      it('should create skill with name and level for LEVEL.SPECIALIST', () => {
        const skill = new Skill({ name: 'architecture', level: LEVEL.SPECIALIST });
        expect(skill.name).toBe('architecture');
        expect(skill.level).toBe(LEVEL.SPECIALIST);
      });
    });

    describe('with invalid level', () => {
      it('should throw error for invalid level string', () => {
        expect(() => {
          new Skill({ name: 'backend', level: 'invalid' });
        }).toThrow('Unknown level "invalid"');
      });

      it('should throw error for undefined level', () => {
        expect(() => {
          new Skill({ name: 'backend', level: undefined });
        }).toThrow('Unknown level "undefined"');
      });

      it('should throw error for null level', () => {
        expect(() => {
          new Skill({ name: 'backend', level: null });
        }).toThrow('Unknown level "null"');
      });

      it('should throw error for empty string', () => {
        expect(() => {
          new Skill({ name: 'backend', level: '' });
        }).toThrow('Unknown level ""');
      });
    });
  });
});
