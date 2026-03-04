import { getTheme } from '@/app/admin/actions';
import ThemePicker from './ThemePicker';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const currentTheme = await getTheme();
    return <ThemePicker currentTheme={currentTheme} />;
}
