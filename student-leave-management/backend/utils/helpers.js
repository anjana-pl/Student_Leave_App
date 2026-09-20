/**
 * Helper utilities for Student Leave Management System
 */

// Generate sequential or random unique request ID, e.g. "LR1024"
const generateRequestId = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `LR${randomNum}`;
};

// Calculate total calendar days between two dates inclusive
const calculateDays = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// Format date nicely: "24 Sep 2026"
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

module.exports = {
  generateRequestId,
  calculateDays,
  formatDate
};
