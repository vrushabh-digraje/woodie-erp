const WORK_ORDER_STATUSES = [
  "Scheduled",
  "In Progress",
  "On Hold",
  "Snagging",
  "Completed",
  "Handed Over",
  "Cancelled",
];

function validateWorkOrderStatusTransition(currentStatus, nextStatus) {
  if (!WORK_ORDER_STATUSES.includes(nextStatus)) {
    const error = new Error(`Invalid status: ${nextStatus}`);
    error.code = "INVALID_STATUS";
    throw error;
  }

  if (nextStatus === "Cancelled") {
    if (currentStatus === "Handed Over") {
      const error = new Error("Handed over work orders cannot be cancelled");
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }
    return;
  }

  if (nextStatus === "In Progress" && (currentStatus === "On Hold" || currentStatus === "Snagging")) {
    return;
  }

  const allowedFrom = {
    "In Progress": ["Scheduled", "On Hold", "Snagging"],
    "On Hold": ["In Progress"],
    Snagging: ["In Progress"],
    Completed: ["In Progress", "Snagging"],
    "Handed Over": ["Completed"],
  };

  const allowed = allowedFrom[nextStatus];
  if (!allowed?.includes(currentStatus)) {
    const error = new Error(
      `Cannot transition from "${currentStatus}" to "${nextStatus}"`,
    );
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }
}

module.exports = { WORK_ORDER_STATUSES, validateWorkOrderStatusTransition };
