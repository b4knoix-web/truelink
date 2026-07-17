// supabase/functions/auryn-inference/index.ts
// Proxies a prompt to b4knoix/AURYN-v0.1 on HuggingFace, keeping the HF token secret.

const HF_TOKEN = Deno.env.get('HF_TOKEN')
const MODEL = 'b4knoix/AURYN-v0.1'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() })
    }

    try {
        const { prompt } = await req.json()
        if (!prompt || typeof prompt !== 'string') {
            return json({ error: 'Missing prompt' }, 400)
        }

        const hfRes = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: { max_new_tokens: 150, temperature: 0.7, return_full_text: false }
            })
        })

        if (!hfRes.ok) {
            const errText = await hfRes.text()
            return json({ error: 'HF request failed', detail: errText }, 502)
        }

        const data = await hfRes.json()
        // HF text-generation returns an array like [{ generated_text: "..." }]
        const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text
        return json({ text: text || null })

    } catch (e) {
        return json({ error: String(e) }, 500)
    }
})

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
}

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    })
}