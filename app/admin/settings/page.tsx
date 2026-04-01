import { getTheme, getAiSettings } from '@/app/admin/actions';
import ThemePicker from './ThemePicker';
import AiSettingsForm from './AiSettings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const [currentTheme, aiSettings] = await Promise.all([
        getTheme(),
        getAiSettings(),
    ]);
    return (
        <>
            <ThemePicker currentTheme={currentTheme} />
            <hr className="my-2" />
            <AiSettingsForm current={aiSettings} />
        </>
    );
}
