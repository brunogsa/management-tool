# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A project management simulation tool that visualizes task dependencies and predicts project completion timelines using Monte Carlo simulation. The tool helps model the impact of team dynamics including skill levels, hiring times, ramp-up periods, sick leave, and turnover on project timelines.

## Prerequisites

Requires `mermaid-cli` installed globally for diagram generation:
```sh
npm i -g mermaid-cli
```

## Common Commands

```sh
# Install dependencies
npm install

# Run tasks-tree command
npm start tasks-tree <input-json-filepath> <output-folder-filepath>

# Run monte-carlo simulation
npm start monte-carlo <json-input-filepath> <output-folder-filepath>

# Run all tests with coverage
npm test

# Run tests for a specific file
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/path/to/file.test.js

# Run tests in watch mode
node --experimental-vm-modules node_modules/jest/bin/jest.js --watch

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## Architecture Overview

### Core Data Models (src/models.js)

The system uses several key data models:

- **Task**: Central entity with properties for estimates, dependencies, parents, required skills, and runtime aggregated data (children, blocking relationships, remaining duration). Contains methods `accountWork()` and `isDone()` for simulation state management.
- **Person**: Represents team members with skills, experience levels, hiring/onboarding status, and vacation schedules. Has runtime properties for capacity and assignment tracking.
- **Skill**: Links tasks to personnel via name and minLevel (intern/junior/mid/senior/specialist).
- **Vacation**: Date ranges when personnel are unavailable.

Task types form a hierarchy: Project > Milestone > Epic > user-story/spike/tech-task/tech-debt/improvement/bug

### Task Graph System (src/utils/graph.js)

The graph utilities construct a bidirectional dependency graph from the task list by **mutating task objects in place** for performance (memory efficiency during large simulations).

**Three public functions** populate runtime properties on tasks:

1. **`attachAllDescendantsFromParentProps(tasks, taskMap)`** - Mutates `task.children` and `task.allDescendantTasks` by inverting parent relationships
2. **`attachBlockedTasksFromDependsOnProps(tasks, taskMap)`** - Mutates `task.tasksBeingBlocked`, `task.allTasksBeingBlocked`, and `task.totalNumOfBlocks` by computing blocking relationships
3. **`populateContainerEstimates(tasks, taskMap)`** - Mutates `task.totalRealisticEstimate` for container tasks (Project/Milestone/Epic) by summing descendant estimates

These functions use clear "attach/populate" verbs to indicate mutation. They must be called in order after creating the task map and before using tasks for visualization or simulation.

### Two-Phase Processing Pattern

Both commands (tasks-tree and monte-carlo) follow the same initialization pattern:

1. Parse and validate input JSON via `inputValidator()`
2. Deep clone the data structure (since graph operations mutate tasks)
3. Build task map via `getTaskMap()`
4. Populate graph data by calling three mutation functions:
   - `attachAllDescendantsFromParentProps(tasks, taskMap)`
   - `attachBlockedTasksFromDependsOnProps(tasks, taskMap)`
   - `populateContainerEstimates(tasks, taskMap)`

### Command Architecture

**tasks-tree command** (src/commands/tasks-tree.js):
- Highlights orphan tasks by creating synthetic "w/o Epic", "w/o Milestone", or "w/o Project" containers
- Generates Mermaid flowchart code showing the dependency DAG
- Renders the flowchart to an image file

**monte-carlo command** (src/commands/monte-carlo.js):
- Runs Monte Carlo simulation via `runMonteCarloSimulation()` (currently scaffolded)
- Plans to generate Gantt charts for various percentiles (50th, 75th, 90th, 95th, 99th)
- Will output probabilistic completion date distributions

### Monte Carlo Simulation Implementation Plan (src/utils/monte-carlo.js)

The simulation is partially implemented with this planned progression:

1. Simple simulation: Basic skill requirements and velocity factors
2. Task split rate handling (15% default)
3. Rework modeling (varies by skill level: 21% intern down to 3% specialist)
4. Vacation scheduling
5. Sick leave simulation (0.0389% weekly default)
6. Hiring and onboarding processes (time varies by level)
7. Turnover and re-hiring/onboarding (0.301% weekly quit rate default)
8. Task start date constraints (`onlyStartableAt`)

The simulation will iterate through sprints, assign tasks to personnel based on skills/availability, account for work via `Task.accountWork()`, and track completion dates.

### Input Format

Input JSON structure (see input-template.json):
- `globalParams`: Time units, hiring/ramp-up times by level, velocity/rework rates by level, sick/turnover rates, start date, task split rate, number of iterations
- `tasks`: Array with id, title, type, estimates (fibonacci and most probable), dependencies (`dependsOnTasks`), hierarchy (`parents`), required skills, optional start date constraint
- `personnel`: Array with id, name, level, hired/onboarded status, skills array, vacation periods

### Project Structure

Follow these folder roles:
- `commands/` - CLI command entry points (validate inputs, call services)
- `utils/` - Generic, reusable helper functions
- `models.js` - Data models and type definitions only

### Code Style

ES modules with ESLint (flat config) configured for:
- 2-space indentation
- Single quotes
- Semicolons required
- Unix line endings
- Unused variables with `_` prefix are allowed (for private helpers and unused params)

**Naming Conventions**:
- **Private/helper functions**: Prefix with `_` (e.g., `_setToArray`, `_buildAllDescendantsFromChildren`)
- **Public exports**: No prefix (e.g., `getTaskMap`, `deepClone`, `attachAllDescendantsFromParentProps`)
- **Mutation-by-design functions**: Use verbs like `attach`, `link`, `populate`, `build`, `add`, `inject` to signal in-place mutation
- **Pure functions**: Use verbs like `calculate`, `compute`, `get`, `find`, `create`, `generate` to signal they return new values

**CRITICAL**: Never modify file formatting unless explicitly requested:
- DO NOT change indentation style
- DO NOT add or remove empty lines
- DO NOT add spaces or tabs to empty lines
- DO NOT add trailing whitespace
- DO NOT change quote style or semicolon usage
- Only modify the exact lines needed for the requested change

### Testing

Jest is configured with Node environment, v8 coverage provider, and ES modules support via `--experimental-vm-modules` flag.

**ES Modules Testing**:
- Use `jest.unstable_mockModule()` instead of `jest.mock()` for mocking ES modules
- Use `await import()` after setting up mocks (static imports are hoisted)
- Mocks must be defined before the module is imported

**Testing Principles**:
- Test behavior, not implementation (prefer black-box integration tests)
- Make tests deterministic and self-contained (no shared state, no randomness)
- Use descriptive test names that explain what and why
- **Only mock external dependencies** - Mock file I/O, network requests, and external processes; let internal utilities run with real implementations for true integration testing
- Calculate expected values from mock data rather than reproducing logic under test

**Example - Minimal Mocking Pattern**:
```js
import { jest } from '@jest/globals';

// Only mock external dependencies (file I/O and rendering)
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockRenderImage = jest.fn();

jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

jest.unstable_mockModule('../../../../src/utils/image-renderer.js', () => ({
  default: mockRenderImage,
}));

// Import after mocking
const { default: tasksTree } = await import('../../../../src/commands/tasks-tree.js');

describe('tasksTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue(JSON.stringify(validInput));
    mockWriteFileSync.mockImplementation(() => {});
    mockRenderImage.mockResolvedValue(undefined);
  });

  it('should validate and process tasks with real validation logic', async () => {
    // Test runs real inputValidator, graph processing, mermaid generation
    await expect(tasksTree('/input.json', '/output')).resolves.toBeUndefined();
  });
});
```

## Development Workflow

Follow this baby-step approach:

1. **Green baseline first** - Ensure all existing tests and lints pass before starting new work
2. **Write the breaking test first** - Add a failing test that captures required behavior
3. **Make the test pass** - Implement minimal code to go green
4. **Run the whole suite** - Verify no regressions
5. **Update docs** - Locate and update related documentation
6. **Human commits only** - No auto-commits; wait for human review

Each step must be the smallest, testable, commit-able change.

## Coding Conventions

- **Preserve comments and formatting** unless explicitly asked to change them
- **Follow existing patterns** throughout the codebase
- **Clean code basics**: Small, pure, well-named functions; no magic numbers; prefer enums/constants; validate inputs; handle errors
- **Prefix private helpers with `_`**: Internal/private functions should start with underscore (e.g., `_setToArray`, `_buildChildrenFromParentProps`)
- **Functions with ≥2 params** - Use a named-param object
- **Loops & conditions**: Avoid negatives, name complex predicates, prefer `for-of` when index unused
- **Extract magic values** - Define reusable constants for all magic strings/numbers, preferably using enums
- **Remove unused code** - Delete code that is no longer used along with its tests
- **Comment non-obvious code** - Ensure everything is understandable to a mid-level developer
- **Prefer tests and logs over comments** - Document behavior through tests and logs whenever possible

### Mutation Patterns

**When to mutate**: Use mutation for performance-critical code (e.g., Monte Carlo simulations with millions of iterations) where immutability would create excessive memory allocations.

**How to signal mutation clearly**:
1. **Use mutation verbs** in function names: `attach*`, `populate*`, `link*`, `build*`, `add*`, `inject*`
2. **Apply SRP** - Each mutating function should modify a small, well-defined set of related properties
3. **Deep clone before mutating** - Commands use `deepClone()` to preserve original input data before graph operations

**Examples**:
- `attachAllDescendantsFromParentProps(tasks, taskMap)` - Name clearly indicates it attaches data to existing tasks
- `populateContainerEstimates(tasks, taskMap)` - Name clearly indicates it populates properties on existing tasks
- Contrast with pure functions: `getTaskMap(tasks)` returns a new Map without modifying input

### Error Handling

- Always handle errors in command entry points to prevent crashes
- Always validate and sanitize inputs before processing

### Examples

Avoid negatives in conditionals:
```js
// Instead of: if (!item.isShrinked)
const isExpandable = !item.isShrinked;
if (isExpandable) { }
```

Name complex conditions:
```js
// Instead of: if (item.type === KIT && !item.isShrinked && item.children.length < 1)
const isExpandableKit = item.type === KIT && !item.isShrinked && item.children.length < 1;
if (isExpandableKit) { }
```

Prefer for-of when index unused:
```js
// Instead of: for (let i = 0; i < items.length; i++)
for (const item of items) { }
```

Use named parameters:
```js
// Instead of: function configure(retries, timeout)
function configure({ retries, timeout }) { }
```
