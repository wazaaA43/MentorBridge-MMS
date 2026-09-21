// "Overdue" is computed, never stored: not complete AND due date has passed.
const DISPLAY_STATUS =
  "CASE WHEN a.status != 'complete' AND a.due_date < date('now') THEN 'overdue' ELSE a.status END";

module.exports = { DISPLAY_STATUS };
