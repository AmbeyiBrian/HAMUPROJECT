import { Redirect } from 'expo-router';

export default function Index() {
  // This will redirect to the login screen
  return <Redirect href="/login" />;
}