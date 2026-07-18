// supabase/functions/auryn-inference/index.ts
// Calls the private HF Space (b4knoix/aurea-brain) which hosts AURYN-v0.1 via Gradio.
// Gradio's queue API is 2-step: POST submits the job, GET (SSE) streams the result.

const HF_TOKEN = Deno.env.get('HF_TOKEN')
const SPACE_URL = 'https://b4knoix-aurea-brain.hf.space'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() })
    }

    try {
        const { prompt } = await req.json()
        if (!prompt || typeof prompt !== 'string') {
            return json({ error: 'Missing prompt' }, 400)
        }

        // ---- Step 1: submit the job ----
        const postRes = await fetch(`${SPACE_URL}/gradio_api/call/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`
            },
            body: JSON.stringify({ data: [prompt] })
        })

        if (!postRes.ok) {
            const errText = await postRes.text()
            return json({ error: 'Space POST failed', detail: errText }, 502)
        }

        const postData = await postRes.json()
        const eventId = postData.event_id
        if (!eventId) {
            return json({ error: 'No event_id returned', detail: JSON.stringify(postData) }, 502)
        }

        // ---- Step 2: stream the result (SSE) ----
        const getRes = await fetch(`${SPACE_URL}/gradio_api/call/predict/${eventId}`, {
            headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
        })

        if (!getRes.ok || !getRes.body) {
            const errText = getRes.body ? await getRes.text() : 'no body'
            return json({ error: 'Space GET failed', detail: errText }, 502)
        }

        const reader = getRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let resultText: string | null = null

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const parsed = JSON.parse(line.slice(6))
                        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                            resultText = parsed[0]
                        }
                    } catch (_e) { /* ignore partial/non-JSON lines */ }
                }
            }
        }

        return json({ text: resultText })

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