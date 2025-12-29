import { Stack } from 'expo-router';
import Colors from '../../constants/Colors';

export default function AnalyticsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.textOnPrimary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Reports & Analytics' }} />
        </Stack>
    );
}
