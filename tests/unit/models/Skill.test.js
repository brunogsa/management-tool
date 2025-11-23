import { Skill, LEVEL } from '../../../src/models.js';

describe('Skill', () => {
  describe('constructor({ name, minLevel })', () => {
    describe('with valid parameters', () => {
      it('should create skill with name and minLevel for LEVEL.INTERN', () => {
        const skill = new Skill({ name: 'backend', minLevel: LEVEL.INTERN });
        expect(skill.name).toBe('backend');
        expect(skill.minLevel).toBe(LEVEL.INTERN);
      });

      it('should create skill with name and minLevel for LEVEL.JUNIOR', () => {
        const skill = new Skill({ name: 'frontend', minLevel: LEVEL.JUNIOR });
        expect(skill.name).toBe('frontend');
        expect(skill.minLevel).toBe(LEVEL.JUNIOR);
      });

      it('should create skill with name and minLevel for LEVEL.MID', () => {
        const skill = new Skill({ name: 'fullstack', minLevel: LEVEL.MID });
        expect(skill.name).toBe('fullstack');
        expect(skill.minLevel).toBe(LEVEL.MID);
      });

      it('should create skill with name and minLevel for LEVEL.SENIOR', () => {
        const skill = new Skill({ name: 'backend', minLevel: LEVEL.SENIOR });
        expect(skill.name).toBe('backend');
        expect(skill.minLevel).toBe(LEVEL.SENIOR);
      });

      it('should create skill with name and minLevel for LEVEL.SPECIALIST', () => {
        const skill = new Skill({ name: 'architecture', minLevel: LEVEL.SPECIALIST });
        expect(skill.name).toBe('architecture');
        expect(skill.minLevel).toBe(LEVEL.SPECIALIST);
      });
    });

    describe('with invalid minLevel', () => {
      it('should throw error for invalid minLevel string', () => {
        expect(() => {
          new Skill({ name: 'backend', minLevel: 'invalid' });
        }).toThrow('Unknown minLevel "invalid"');
      });

      it('should throw error for undefined minLevel', () => {
        expect(() => {
          new Skill({ name: 'backend', minLevel: undefined });
        }).toThrow('Unknown minLevel "undefined"');
      });

      it('should throw error for null minLevel', () => {
        expect(() => {
          new Skill({ name: 'backend', minLevel: null });
        }).toThrow('Unknown minLevel "null"');
      });

      it('should throw error for empty string', () => {
        expect(() => {
          new Skill({ name: 'backend', minLevel: '' });
        }).toThrow('Unknown minLevel ""');
      });
    });
  });
});
