import { Stack } from 'expo-router';
import Colors from '../../constants/Colors';

export default function CustomerLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: Colors.textOnPrimary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="new" options={{ title: 'New Customer' }} />
            <Stack.Screen name="[id]" options={{ title: 'Customer Details' }} />
            <Stack.Screen name="edit" options={{ title: 'Edit Customer' }} />
        </Stack>
    );
}
