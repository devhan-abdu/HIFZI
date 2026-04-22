export const formatErrorMessage = (error: any): string => {
  if (!error) return "An unknown error occurred.";
  
  const message = typeof error === 'string' ? error : error.message || "";
  
  // SQLite Errors
  if (message.includes("no such table")) {
    return "Please wait a moment and try again.";
  }
  
  if (message.includes("NativeDatabase") || message.includes("prepareAsync")) {
    return "A system error occurred. Please restart the app.";
  }
  
  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your connection.";
  }
  
  // Specific Business Errors
  if (message.includes("select at least one day")) {
    return "Please select at least one day for your schedule.";
  }
  
  // Default fallback
  return message || "Something went wrong. Please try again.";
};
