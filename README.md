# management-tool

A project management simulation tool that helps visualize task dependencies and predict project completion timelines using Monte Carlo simulation.

## Project Goals

This tool aims to:

1. **Visualize project structure** - Generate dependency graphs showing relationships between tasks, epics, milestones, and projects
2. **Simulate project execution** - Use Monte Carlo methods to predict completion dates considering various real-world factors
3. **Account for team dynamics** - Model the impact of different skill levels, hiring times, ramp-up periods, sick leave, and turnover
4. **Support planning decisions** - Help project managers understand the probabilistic nature of project timelines

## Pre-reqs

Ensure you have `mermaid-cli` and `yarn` installed:

```sh
npm i -g mermaid-cli
npm i -g yarn
```

## Tool Functionalities

The tool provides two main commands:

### 1. tasks-tree

Generates a Mermaid flowchart diagram visualizing the task dependencies within a project as a Directed Acyclic Graph (DAG).

**Learn more:**
```
yarn tasks-tree --help
```

### 2. monte-carlo

Performs a Monte Carlo simulation to predict the probabilistic distribution of the project's completion time, considering various parameters like sick rate, turnover rate, and rework rates.

**Learn more:**
```
yarn monte-carlo --help
```

**Simulation Features:**

The Monte Carlo simulation models realistic project dynamics through multiple iterations to generate probabilistic completion forecasts:

- **Core Simulation**
  - Multi-iteration execution with percentile analysis (50th, 75th, 90th, 95th, 99th)
  - Time tracking with sprint/week progression
  - Task dependency and startability detection
  - Skill-based personnel matching with minimum level requirements
  - Velocity factors by skill level (intern: 0.5, junior: 0.75, mid: 1.0, senior: 1.25, specialist: 1.5)

- **Task Dynamics**
  - Task splits: 15% probability of tasks splitting during execution (configurable)
  - Rework: Skill-based probability (intern: 21%, junior: 13%, mid: 8%, senior: 5%, specialist: 3%)

- **Personnel Availability**
  - Vacation scheduling: Zero capacity during scheduled vacation periods
  - Sick leave: 0.0389% weekly probability per person, random 1-5 day duration

- **Hiring & Onboarding**
  - Hiring delays: Level-based hiring time before personnel become available
  - Onboarding periods: 50% capacity reduction during ramp-up time
  - Future hire modeling: Personnel can start as unhired and join during project execution

- **Turnover & Replacement**
  - Personnel departure: 0.301% weekly quit probability
  - Automatic replacement: New personnel created with same skills and level
  - Full replacement cycle: Hiring delay + onboarding period for replacements

- **Constraints**
  - Task start dates: Optional `onlyStartableAt` field to delay task availability

- **Output**
  - Gantt charts: Mermaid diagrams for each percentile showing task start/end dates
  - Completion date distributions: Statistical analysis across all iterations

## JSON Input Format

Check [input-template.json](./input-template.json) for the complete structure. The input file includes:

- **Global parameters** - Time units, hiring times, skill levels, velocity factors, etc.
- **Tasks** - Project components with dependencies, skill requirements, and estimates
- **Personnel** - Team members with skills, experience levels, and vacation schedules

### Task Types

The system supports **9 task types** organized in a 3-level hierarchy:

#### Container Types

These types organize work and aggregate estimates from their children:

- **`project`** - Top-level container for the entire initiative
  - Cannot have parents
  - Contains milestones and optionally epics or leaf tasks
  - Example: "Mobile App Rewrite", "Platform Migration"

- **`milestone`** - Major phase or delivery point within a project
  - Must have a project as parent
  - Contains epics and optionally leaf tasks
  - Example: "MVP Launch", "Beta Release", "Q1 Deliverables"

- **`epic`** - Feature set or related group of work items
  - Must have a milestone or project as parent
  - Contains only leaf tasks
  - Example: "User Authentication", "Payment Processing", "Admin Dashboard"

#### Leaf Types (Actual Work)

These types represent executable work items that cannot contain children:

- **`user-story`** - User-facing feature delivering direct value
  - Example: "As a user, I can reset my password via email"

- **`spike`** - Time-boxed research, investigation, or proof-of-concept
  - Example: "Research best GraphQL client library", "Prototype real-time notifications"

- **`tech-task`** - Technical implementation work without direct user visibility
  - Example: "Set up CI/CD pipeline", "Configure database indexes"

- **`tech-debt`** - Refactoring, cleanup, or technical debt reduction
  - Example: "Refactor authentication module", "Remove deprecated API endpoints"
:x

- **`improvement`** - Enhancement to existing functionality (performance, UX, etc.)
  - Example: "Optimize image loading performance", "Add keyboard shortcuts"

- **`bug`** - Defect fixes
  - Example: "Fix login redirect loop", "Resolve memory leak in dashboard"

#### Key Behaviors

**Container tasks** (project/milestone/epic):
- Automatically aggregate time estimates from all descendants
- Display total estimates in diagrams
- When blocked, all their children are also blocked

**Leaf tasks**:
- Use individual Fibonacci and realistic estimates
- Represent actual executable work in simulations
- Can have skill requirements and be assigned to personnel

## Implementation Status

### Completed Features

- Data models for Tasks, Skills, Personnel, and Vacations
- Task dependency graph utilities
- Mermaid diagram generation for task trees
- Input validation framework
- Basic project structure and command interface
- Monte Carlo simulation engine with skill matching, task splits, rework, vacations, sick leave, hiring/onboarding, turnover, and Gantt output

### Completed Implementation

The Monte Carlo simulation is fully implemented with:

- ✅ Multi-iteration execution with percentile analysis (50th, 75th, 90th, 95th, 99th)
- ✅ Time tracking with weekly progression
- ✅ Task dependency and startability detection
- ✅ Skill-based personnel matching with minimum level requirements
- ✅ Velocity factors by skill level
- ✅ Task prioritization: "Finish what we started" philosophy (in-progress tasks first, then by blocking count)
- ✅ Rework modeling (skill-based rates, consumed without generating more rework)
- ✅ Vacation scheduling (manual + automatic 4-week annual vacations with max 1 person per week)
- ✅ Sick leave simulation (0.0389% weekly probability, 1-week duration)
- ✅ Hiring & onboarding with capacity reduction during ramp-up
- ✅ Turnover & automatic replacement
- ✅ Task start date constraints (onlyStartableAt field)
- ✅ Change Request milestone generation (scope changes as percentage of total effort)
- ✅ Personnel startDate support (for modeling new hires during project)
- ✅ Enhanced Gantt charts showing estimates, rework, blocking counts, and vacations

## TODOs

### Task Assignment Heuristic Improvements

The current simulation uses a simple greedy heuristic in `assignTasksToPersonnel()` that:
1. **First priority**: Finishes in-progress tasks (tasks where work has already begun)
2. **Second priority**: Assigns most senior available person to highest-priority task (by blocking count)

This works well but could be enhanced with:

- **Skill affinity scoring**: Prefer people with exact skill matches or experience in similar tasks
- **Workload balancing**: Avoid overloading the same person repeatedly; distribute work more evenly
- **Learning curve modeling**: People get faster on repeated similar tasks (velocity increases)
- **Task switching penalties**: Account for context switching costs when jumping between different task types
- **Parallel work support**: Allow configurable tasks that multiple people can work on simultaneously

See `assignTasksToPersonnel()` in `src/utils/monte-carlo.js` (lines ~511-546) for current implementation.

**Why the simple heuristic is OK for now:** The greedy approach provides a reasonable baseline and ensures all personnel are utilized efficiently. The "finish what we started" rule reduces WIP and is more realistic than starting everything in parallel. More sophisticated heuristics require additional data (historical velocity, task similarity metrics) that may not always be available.
