# TOC MVP Infra (LiteLLM + OpenRouter + n8n)

This repo contains Step 1 infra for:
- LiteLLM proxy (`http://localhost:4000`)
- Redis cache
- Postgres (for LiteLLM UI/keys)
- n8n (`http://localhost:5678`)

## Structure

```text
infra/
  docker-compose.yml
  litellm/
    config.yaml
    .env.example
n8n/
  workflows/
```

## Quick Start

1. Copy env file:

```bash
cp infra/litellm/.env.example infra/.env
```

2. Edit `infra/.env` and set `OPENROUTER_API_KEY` (required).

3. Start services:

```bash
cd infra
docker compose up -d
```

## Verify LiteLLM (OpenAI-compatible)

Use the same request format for each alias.
Replace `YOUR_MASTER_KEY` with `LITELLM_MASTER_KEY` from `infra/.env`.

`or-fast`
```bash
curl -sS http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -d '{
    "model": "or-fast",
    "messages": [{"role": "user", "content": "Say hello in one short sentence."}],
    "max_tokens": 120
  }'
```

`or-strong`
```bash
curl -sS http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -d '{
    "model": "or-strong",
    "messages": [{"role": "user", "content": "Say hello in one short sentence."}],
    "max_tokens": 120
  }'
```

`or-ultracheap`
```bash
curl -sS http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -d '{
    "model": "or-ultracheap",
    "messages": [{"role": "user", "content": "Say hello in one short sentence."}],
    "max_tokens": 120
  }'
```

`or-fast2`
```bash
curl -sS http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -d '{
    "model": "or-fast2",
    "messages": [{"role": "user", "content": "Say hello in one short sentence."}],
    "max_tokens": 120
  }'
```

`or-reason`
```bash
curl -sS http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -d '{
    "model": "or-reason",
    "messages": [{"role": "user", "content": "Say hello in one short sentence."}],
    "max_tokens": 120
  }'
```

`or-oss-strong`
```bash
curl -sS http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  -d '{
    "model": "or-oss-strong",
    "messages": [{"role": "user", "content": "Say hello in one short sentence."}],
    "max_tokens": 120
  }'
```

Read token usage from the response fields:
- `usage.prompt_tokens`
- `usage.completion_tokens`
- `usage.total_tokens`

## UI (Step 3)

Minimal UI is located in `ui/`.

Start it:

```bash
cd ui
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The UI posts to:

```text
http://localhost:5678/webhook/litellm-webhook
```

Before testing, import and activate `n8n/workflows/litellm_webhook.json` in n8n.
