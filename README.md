# management-tool

A project management simulation tool that helps visualize task dependencies and predict project completion timelines using Monte Carlo simulation.

## Project Goals

This tool aims to:

1. **Visualize project structure** - Generate dependency graphs showing relationships between tasks, epics, milestones, and projects  
2. **Simulate project execution** - Use Monte Carlo methods to predict completion dates considering various real-world factors  
3. **Account for team dynamics** - Model the impact of different skill levels, hiring times, ramp-up periods, sick leave, and turnover  
4. **Support planning decisions** - Help project managers understand the probabilistic nature of project timelines  

## Pre-reqs

Ensure you have `mermaid-cli` installed:

```sh
npm i -g mermaid-cli
```

## Tool Functionalities

The tool provides the commands below:

### 1. tasks-tree

**Purpose:** Generates a Mermaid flowchart diagram visualizing the task dependencies within a project as a Directed Acyclic Graph (DAG).

**Usage:**

```
npm start tasks-tree <input-json-filepath> <output-folder-filepath>
```

**Inputs:**
- `input-json-filepath`: Path to the JSON file containing the parameters, tasks and personnel data.
- `output-folder-filepath`: Directory path where the Mermaid code and the rendered image will be saved.

### 2. monte-carlo

**Purpose:** Performs a Monte Carlo simulation to predict the probabilistic distribution of the project's completion time, considering various parameters like sick rate, turnover rate, and rework rates.

**Usage:**

```
npm start monte-carlo <json-input-filepath> <output-filepath>
```

**Inputs:**
- `json-input-filepath`: Path to the JSON file containing comprehensive project data.
- `output-filepath`: Directory path where the probabilistic distributions and Gantt charts will be saved.

## JSON Input Format

Check [input-template.json](./input-template.json) for the complete structure. The input file includes:

- **Global parameters** - Time units, hiring times, skill levels, velocity factors, etc.
- **Tasks** - Project components with dependencies, skill requirements, and estimates  
- **Personnel** - Team members with skills, experience levels, and vacation schedules  

## Implementation Status

### Completed Features

- Data models for Tasks, Skills, Personnel, and Vacations  
- Task dependency graph utilities  
- Mermaid diagram generation for task trees  
- Input validation framework  
- Basic project structure and command interface  

### Pending Implementation

The following refactors and design tasks are planned:

- refactor name: `cummulativeTasksBeingBlocked` -> all transitively blocked tasks
- refactor name: `blocking` -> expanded blocking including folder children
- refactor name: `numOfAssignedTasks` -> count of assigned tasks during simulation
- refactor name: `remainingCapacity` -> available work capacity in current sprint
- refactor name: `remainingRehiringDuration` -> time until replacement is hired/onboarded

- refactor, should probably have a better name and signature: `agreggateAllChildTasks`, `agreggateChildrenTasks`, `agreggateAllTasksYouBlock`, `agreggateTasksYouDirectlyBlock`, `computeTotalEstimateForTask`, `agreggateTotalNumOfBlocks`, `agreggateInfosByExploringTasksGraph`

- refactor, could probably improve SRP: `agreggateAllChildTasks`, `agreggateChildrenTasks`, `agreggateAllTasksYouBlock`, `agreggateTasksYouDirectlyBlock`, `computeTotalEstimateForTask`, `agreggateTotalNumOfBlocks`, `agreggateInfosByExploringTasksGraph`

- refactor: no function should mutate params -> refactor one at a time
- refactor: `requiredSkills[].level` -> `minLevel`
- document: `tasks[].type`
- should we have on `parameters.json` an array `skills`? Or should we extract those from the array `personnel`?

The Monte Carlo simulation is partially implemented with the following steps planned:

1. Simple simulation: Basic skill requirements and velocity factors  
2. Task split rate handling  
3. Rework modeling  
4. Vacation scheduling  
5. Sick leave simulation  
6. Hiring and onboarding processes  
7. Turnover and re-hiring/onboarding  
8. Task start date constraints  
