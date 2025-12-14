/**
 * Simple structured logger for the management-tool CLI.
 *
 * Log levels:
 * - info: Key events (iteration start/end, task completion, person hired/quit)
 * - debug: Detailed events (assignments, capacity changes, week transitions)
 *
 * Set LOG_LEVEL=debug to see all logs, LOG_LEVEL=none to silence all logs.
 * Default is 'info'.
 */

const LOG_LEVEL = {
  NONE: 'none',
  INFO: 'info',
  DEBUG: 'debug',
};

const LOG_LEVEL_PRIORITY = {
  [LOG_LEVEL.NONE]: 0,
  [LOG_LEVEL.INFO]: 1,
  [LOG_LEVEL.DEBUG]: 2,
};

// Mutable config for runtime level changes (useful for tests)
let currentLogLevel = process.env.LOG_LEVEL || LOG_LEVEL.INFO;

const setLogLevel = (level) => {
  currentLogLevel = level;
};

const getLogLevel = () => currentLogLevel;

const _shouldLog = (level) => {
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel];
};

const _formatTimestamp = () => {
  return new Date().toISOString();
};

const _formatMessage = ({ level, message, context = {} }) => {
  return {
    timestamp: _formatTimestamp(),
    level: level.toUpperCase(),
    message,
    ...context,
  };
};

const info = (message, context = {}) => {
  if (!_shouldLog(LOG_LEVEL.INFO)) return;
  console.log(JSON.stringify(_formatMessage({ level: LOG_LEVEL.INFO, message, context })));
};

const debug = (message, context = {}) => {
  if (!_shouldLog(LOG_LEVEL.DEBUG)) return;
  console.log(JSON.stringify(_formatMessage({ level: LOG_LEVEL.DEBUG, message, context })));
};

export {
  LOG_LEVEL,
  setLogLevel,
  getLogLevel,
  info,
  debug,
};
