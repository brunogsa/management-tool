# management-tool

## Pre-reqs

Ensure you have `mermaid-cli` installed:

```sh
npm i -g mermaid-cli
```

## Tool Functionalities

The tool provides the commands bellow:

### 1. tasks-tree

**Purpose:** Generates a Mermaid flowchart diagram visualizing the task dependencies within a project as a Directed Acyclic Graph (DAG).

**Usage:**

```
npm tasks-tree <input-json-filepath> <output-folder-filepath>
```

**Inputs:**
- `input-json-filepath`: Path to the JSON file containing the parameters, tasks and personnel data.
- `output-folder-filepath`: Directory path where the Mermaid code and the rendered image will be saved.

### 2. monte-carlo

**Purpose:** Performs a Monte Carlo simulation to predict the probabilistic distribution of the project's completion time, considering various parameters like sick rate, turnover rate, and rework rates.

**Usage:**

```
npm monte-carlo <json-input-filepath> <output-filepath>
```

**Inputs:**
- `json-input-filepath`: Path to the JSON file containing comprehensive project data.
- `output-filepath`: Directory path where the probabilistic distributions and Gantt charts will be saved.

## JSON Input Format

Check [input-template.json](./input-template.json).
