import { Stack } from 'expo-router';
import Colors from '../../constants/Colors';

export default function MeterReadingLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.textOnPrimary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Meter Readings' }} />
            <Stack.Screen name="new" options={{ title: 'New Reading' }} />
            <Stack.Screen name="[id]" options={{ title: 'Reading Details' }} />
        </Stack>
    );
}
