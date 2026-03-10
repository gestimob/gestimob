import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization')!;
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

        // Create an admin client to create users
        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Initialize user client to verify token
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Verify the user making the request
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const { data: { user }, error: authError } = await userClient.auth.getUser(token);
        if (authError || !user) {
            console.error("Auth Error:", authError);
            return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authError?.message || 'No user') }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Verify the user making the request is an admin
        const { data: profile } = await adminClient
            .from('profile')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden. Admin privileges required.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { email, password, role, nome } = await req.json();

        if (!email || !password || !role) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 1. Create the user in Auth
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { nome_completo: nome, role: role }
        });

        if (createError) {
            console.error("Auth creation error:", createError);
            return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. Insert into the profile table
        if (newUser && newUser.user) {
            const { error: profileError } = await adminClient
                .from('profile')
                .insert([{
                    id: newUser.user.id,
                    email: email,
                    role: role,
                    nome: nome,
                }]);

            if (profileError) {
                console.error("Profile insertion error:", profileError);
                return new Response(JSON.stringify({ error: 'User created in auth, but failed to create profile: ' + profileError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        return new Response(JSON.stringify({ message: 'User created successfully', user: newUser.user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Unhandled error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
