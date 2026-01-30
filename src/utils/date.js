function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addWeeksToDate(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function calculateWeeksBetween(startDate, targetDate) {
  const diffMs = targetDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export {
  formatDate,
  addWeeksToDate,
  calculateWeeksBetween,
};
