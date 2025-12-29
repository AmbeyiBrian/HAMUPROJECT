import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

export default function RefillLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.primary,
                },
                headerTintColor: Colors.textOnPrimary,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="new" options={{ title: 'New Refill' }} />
        </Stack>
    );
}
