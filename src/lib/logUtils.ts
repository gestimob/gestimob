import { supabase } from './supabase';

export async function logAction(action: string, details: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
            console.warn('Cannot log action: no active session.');
            return;
        }

        const { error } = await supabase.from('action_logs').insert([{
            user_id: session.user.id,
            action,
            details
        }]);

        if (error) {
            console.error('Failed to write action log:', error);
        }
    } catch (err) {
        console.error('Exception writing action log:', err);
    }
}
