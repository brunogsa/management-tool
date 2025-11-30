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

### Pending Implementation

The following refactors and design tasks are planned:

- should we have on `parameters.json` an array `skills`? Or should we extract those from the array `personnel`?

The Monte Carlo simulation is partially implemented with the following baby steps planned:

#### Phase 1: Simple Simulation Foundation

1. **Time tracking setup**
   - Initialize simulation state with current sprint/week counter
   - Add test for sprint increment logic

2. **Task startability detection**
   - Implement function to find tasks with all dependencies completed
   - Handle tasks with no dependencies (immediate start)
   - Add test for dependency-blocked vs startable tasks

3. **Basic skill matching**
   - Match personnel skills to task required skills
   - Check minimum skill level requirements
   - Add test for skill-qualified vs unqualified personnel

4. **Simple work assignment**
   - Assign available capacity from qualified personnel to tasks
   - Use velocity factor from personnel skill level (intern: 0.5, junior: 0.75, mid: 1.0, senior: 1.25, specialist: 1.5)
   - Add test for capacity allocation

5. **Task progress tracking**
   - Implement `Task.accountWork(amount)` to reduce remaining duration
   - Implement `Task.isDone()` to check completion status
   - Add test for work accounting and completion detection

6. **Single iteration execution**
   - Run simulation loop: increment time → find startable → assign work → repeat until all tasks done
   - Track completion date for each task
   - Add test for single iteration returning completion dates

7. **Multiple iterations aggregation**
   - Run N iterations with realistic estimate sampling (use most probable estimate as baseline)
   - Collect all completion dates across iterations
   - Add test for N iterations producing N completion dates

8. **Percentile calculation**
   - Calculate 50th, 75th, 90th, 95th, 99th percentiles from completion dates
   - Add test for percentile calculation from sample data

#### Phase 2: Task Split Rate

9. **Split probability detection**
   - During task start, check if split occurs (15% default rate from globalParams.taskSplitRate)
   - Add test for split probability triggering

10. **Split task creation**
    - Create new task with same properties as original
    - Divide remaining estimate between original and new task
    - Add test for task duplication with estimate division

11. **Split dependency update**
    - New task blocks everything original task was blocking
    - Original task now blocks the new task
    - Add test for dependency graph update after split

#### Phase 3: Rework Modeling

12. **Rework probability by skill level**
    - On task completion, check if rework needed (intern: 21%, junior: 13%, mid: 8%, senior: 5%, specialist: 3%)
    - Use lowest skill level among assigned personnel
    - Add test for rework probability based on skill level

13. **Rework task generation**
    - Create rework task with estimate = original estimate × 0.5
    - Link rework task to block what original was blocking
    - Add test for rework task creation and linking

#### Phase 4: Vacation Scheduling

14. **Vacation data loading**
    - Read vacation date ranges from personnel.vacations array
    - Parse start/end dates
    - Add test for vacation data parsing

15. **Capacity reduction during vacation**
    - Check if current date falls within any vacation period
    - Set personnel capacity to 0 during vacation
    - Add test for zero capacity during vacation dates

#### Phase 5: Sick Leave Simulation

16. **Weekly sick probability**
    - At start of each week, check 0.0389% probability per person (from globalParams.weeklyProbabilityOfGettingSick)
    - Add test for sick leave triggering

17. **Sick leave duration**
    - Random duration 1-5 days
    - Set capacity to 0 during sick period
    - Add test for capacity reduction during sick leave

#### Phase 6: Hiring and Onboarding

18. **Hiring status tracking**
    - Skip personnel where `isHired: false`
    - Track hiring delay based on level (from globalParams.hiringTimeInWeeks)
    - Add test for excluding unhired personnel

19. **Hiring delay simulation**
    - Mark person as hired after hiring delay passes
    - Add test for hire date calculation

20. **Onboarding status tracking**
    - Skip personnel where `isOnboarded: false` (even if hired)
    - Track onboarding duration based on level (from globalParams.rampUpTimeInWeeks)
    - Add test for excluding non-onboarded personnel

21. **Onboarding capacity reduction**
    - During onboarding, reduce capacity by 50%
    - Add test for reduced capacity calculation

#### Phase 7: Turnover and Replacement

22. **Weekly quit probability**
    - At start of each week, check 0.301% probability per person (from globalParams.weeklyProbabilityOfQuitting)
    - Add test for turnover triggering

23. **Personnel departure**
    - Mark person as departed
    - Remove from available capacity
    - Track unassigned work
    - Add test for capacity removal and work reassignment

24. **Replacement hiring**
    - Create new person with same skills and level
    - Apply hiring delay
    - Add test for replacement person creation

25. **Replacement onboarding**
    - Apply onboarding duration after hiring completes
    - Apply onboarding capacity reduction
    - Add test for replacement onboarding cycle

#### Phase 8: Task Start Date Constraints

26. **Start date constraint loading**
    - Read task.onlyStartableAt date field
    - Parse constraint dates
    - Add test for constraint data parsing

27. **Date-based task blocking**
    - Exclude tasks from startable set if current date < onlyStartableAt
    - Add test for date-blocked vs date-available tasks

#### Phase 9: Output Generation

28. **Gantt chart data preparation**
    - For each percentile (50th, 75th, 90th, 95th, 99th), extract task start/end dates from that iteration
    - Add test for data extraction

29. **Gantt chart rendering**
    - Generate Mermaid Gantt chart code for each percentile
    - Render to image files
    - Add test for Gantt output file creation  
