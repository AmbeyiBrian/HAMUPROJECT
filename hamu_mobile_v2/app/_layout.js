/**
 * Root Layout
 * Wraps the entire app with providers and handles navigation.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../services/AuthContext';
import Colors from '../constants/Colors';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="light" backgroundColor={Colors.primary} translucent={false} />
                <Stack
                    screenOptions={{
                        headerStyle: { backgroundColor: Colors.primary },
                        headerTintColor: Colors.textOnPrimary,
                        headerTitleStyle: { fontWeight: '600' },
                        contentStyle: { backgroundColor: Colors.background },
                    }}
                >
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                    <Stack.Screen name="verify-code" options={{ headerShown: false }} />
                    <Stack.Screen name="reset-password" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="refill" options={{ headerShown: false }} />
                    <Stack.Screen name="sale" options={{ headerShown: false }} />
                    <Stack.Screen name="customer" options={{ headerShown: false }} />
                    <Stack.Screen name="expense" options={{ headerShown: false }} />
                    <Stack.Screen name="credit" options={{ headerShown: false }} />
                    <Stack.Screen name="stock" options={{ headerShown: false }} />
                    <Stack.Screen name="meter-reading" options={{ headerShown: false }} />
                    <Stack.Screen name="sms" options={{ headerShown: false }} />
                    <Stack.Screen name="analytics" options={{ headerShown: false }} />
                    <Stack.Screen name="notifications" options={{ headerShown: false }} />
                    <Stack.Screen name="sync-queue" options={{ headerShown: false }} />
                    <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
