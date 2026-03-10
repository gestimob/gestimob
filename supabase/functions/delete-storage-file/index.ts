import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REFS = {
    GESTIMOB: Deno.env.get("GESTIMOB_REF"),
    STORAGE: Deno.env.get("STORAGE_REF")
};

const KEYS = {
    GESTIMOB: Deno.env.get("GESTIMOB_SERVICE_ROLE_KEY"),
    STORAGE: Deno.env.get("STORAGE_SERVICE_ROLE_KEY")
};

const gestimobClient = createClient(`https://${REFS.GESTIMOB}.supabase.co`, KEYS.GESTIMOB);
const storageClient = createClient(`https://${REFS.STORAGE}.supabase.co`, KEYS.STORAGE);

serve(async (req) => {
    try {
        const payload = await req.json();
        const { type, table, record, old_record } = payload;

        if (type !== "DELETE") {
            return new Response(JSON.stringify({ message: "Ignore non-DELETE events" }), { status: 200 });
        }

        const recordToDelete = old_record || record;
        if (!recordToDelete) {
            return new Response(JSON.stringify({ error: "No record found" }), { status: 400 });
        }

        const urlsToDelete: string[] = [];
        switch (table) {
            case "imoveis":
                if (recordToDelete.fotos_urls) urlsToDelete.push(...recordToDelete.fotos_urls);
                if (recordToDelete.arquivo_matricula_url) urlsToDelete.push(recordToDelete.arquivo_matricula_url);
                if (recordToDelete.iptu_pdf_url) urlsToDelete.push(recordToDelete.iptu_pdf_url);
                break;
            case "clientes":
                if (recordToDelete.documento_identidade_url) urlsToDelete.push(recordToDelete.documento_identidade_url);
                if (recordToDelete.comprovante_residencia_url) urlsToDelete.push(recordToDelete.comprovante_residencia_url);
                if (recordToDelete.documento_conjuge_url) urlsToDelete.push(recordToDelete.documento_conjuge_url);
                if (recordToDelete.selfie_url) urlsToDelete.push(recordToDelete.selfie_url);
                if (recordToDelete.comprovante_renda_url) urlsToDelete.push(recordToDelete.comprovante_renda_url);
                break;
            case "proprietarios":
                if (recordToDelete.documento_identidade_url) urlsToDelete.push(recordToDelete.documento_identidade_url);
                if (recordToDelete.documento_selfie_url) urlsToDelete.push(recordToDelete.documento_selfie_url);
                break;
            case "empresas":
                if (recordToDelete.contrato_social_url) urlsToDelete.push(recordToDelete.contrato_social_url);
                break;
            case "empresa_responsaveis":
                if (recordToDelete.documento_url) urlsToDelete.push(recordToDelete.documento_url);
                if (recordToDelete.selfie_url) urlsToDelete.push(recordToDelete.selfie_url);
                break;
            case "alugueis":
                if (recordToDelete.comprovante_cagepa_url) urlsToDelete.push(recordToDelete.comprovante_cagepa_url);
                if (recordToDelete.comprovante_energisa_url) urlsToDelete.push(recordToDelete.comprovante_energisa_url);
                break;
            case "parcelas":
                if (recordToDelete.boleto_url) urlsToDelete.push(recordToDelete.boleto_url);
                break;
            case "configuracoes":
                if (recordToDelete.logo_url) urlsToDelete.push(recordToDelete.logo_url);
                if (recordToDelete.rodape_url) urlsToDelete.push(recordToDelete.rodape_url);
                if (recordToDelete.hero_bg_desktop_url) urlsToDelete.push(recordToDelete.hero_bg_desktop_url);
                if (recordToDelete.hero_bg_mobile_url) urlsToDelete.push(recordToDelete.hero_bg_mobile_url);
                break;
            case "contratos":
                if (recordToDelete.contrato_assinado_url) urlsToDelete.push(recordToDelete.contrato_assinado_url);
                break;
        }

        const results = [];
        for (const url of urlsToDelete) {
            if (!url || typeof url !== 'string') continue;

            const match = url.match(/https:\/\/([^\.]+)\.supabase\.co\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
            if (match) {
                const ref = match[1];
                const bucket = match[2];
                const path = match[3];

                const client = ref === REFS.GESTIMOB ? gestimobClient : (ref === REFS.STORAGE ? storageClient : null);

                if (client) {
                    console.log(`Deleting from ref ${ref}, bucket ${bucket}: ${path}`);
                    const { error } = await client.storage.from(bucket).remove([path]);
                    results.push({ url, ref, bucket, path, success: !error, error });
                } else {
                    results.push({ url, error: `Unsupported project ref: ${ref}` });
                }
            }
        }

        return new Response(JSON.stringify({ table, results }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
