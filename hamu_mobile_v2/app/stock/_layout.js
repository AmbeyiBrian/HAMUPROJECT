import { Stack } from 'expo-router';
import Colors from '../../constants/Colors';

export default function StockLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.textOnPrimary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Stock Management' }} />
            <Stack.Screen name="add-log" options={{ title: 'Stock Update' }} />
            <Stack.Screen name="add" options={{ title: 'Add Stock Item' }} />
            <Stack.Screen name="logs" options={{ title: 'Stock Logs' }} />
        </Stack>
    );
}
