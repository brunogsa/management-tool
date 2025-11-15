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

# Run tests
npm test

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
- **Skill**: Links tasks to personnel via name and level (intern/junior/mid/senior/specialist).
- **Vacation**: Date ranges when personnel are unavailable.

Task types form a hierarchy: Project > Milestone > Epic > user-story/spike/tech-task/tech-debt/improvement/bug

### Task Graph System (src/utils/graph.js)

The graph utilities construct a bidirectional dependency graph from the task list:

- **Parent-child relationships**: Built from `task.parents` array to create hierarchical project structure (Project contains Milestones, Milestones contain Epics, Epics contain stories/tasks)
- **Blocking relationships**: Built from `task.dependsOnTasks` array to establish task execution order
- **Aggregation**: Computes cumulative children, cumulative blocked tasks, total estimates for folder-like tasks (Projects/Milestones/Epics), and total blocking count

The `agreggateInfosByExploringTasksGraph()` function traverses the graph to populate all runtime properties. This must be called after creating the task map and before using tasks for visualization or simulation.

### Two-Phase Processing Pattern

Both commands (tasks-tree and monte-carlo) follow the same initialization pattern:

1. Parse and validate input JSON via `inputValidator()`
2. Deep clone the data structure (since graph operations mutate tasks)
3. Build task map via `getTaskMap()`
4. Aggregate graph relationships via `agreggateInfosByExploringTasksGraph()`

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

### Code Style

ES modules with ESLint configured for:
- 2-space indentation
- Single quotes
- Semicolons required
- Unix line endings

### Testing

Currently no test files exist (tests directory only has .gitkeep). Jest is configured with Node environment and v8 coverage provider.
