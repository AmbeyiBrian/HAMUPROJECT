// Logger utility for customer insights
export const logCustomerData = (action: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`Customer Data [${action}]`);
    console.log('Data:', data);
    console.groupEnd();
  }
};
