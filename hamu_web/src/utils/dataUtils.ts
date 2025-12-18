// Helper functions for generating sample data when API doesn't provide enough
export function generateSampleMonthlyData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(month => ({
    month,
    count: Math.round(Math.random() * 3) + 1
  }));
}

export function generateSampleMonthlySpendingData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map(month => ({
    month,
    amount: Math.round(Math.random() * 500) + 200
  }));
}
