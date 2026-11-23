# Ollama local and Cloud inference

Codex Security can use Ollama's OpenAI-compatible **Responses** endpoint.
The model must support tool/function calling and a sufficiently large context
window (Ollama recommends **64k tokens or more** for Codex). The native local
provider is `ollama`; direct Cloud is `ollama-cloud`.

## Local Ollama (no credentials or subscription)

```sh
ollama pull gpt-oss:20b
# In the target repository:
cs scan . --provider ollama --model gpt-oss:20b --auth auto
```

Ollama must be listening at `http://127.0.0.1:11434` before the scan.
The local built-in provider needs no OpenAI login or API key. An unrelated
`OPENAI_API_KEY` or `CODEX_API_KEY` should not authenticate the local model.

To connect to a remote Ollama server over a private network, override the
native Codex OSS endpoint while retaining its keyless `ollama` provider:

```sh
export CODEX_OSS_BASE_URL="http://ollama.internal:11434/v1"
cs scan . --provider ollama --model gpt-oss:20b --auth auto
```

`CODEX_OSS_BASE_URL` is a native Codex setting. Keep the endpoint inside
a private network or use an SSH tunnel. Do not expose a keyless Ollama
server to the public internet.

## Direct Ollama Cloud

Get a key from Ollama and export it in your environment (do not commit it).
Cloud billing/limits are controlled by your Ollama account.

```sh
export OLLAMA_API_KEY="<your-ollama-api-key>"
cs scan . --provider ollama-cloud --model gemma4:31b --auth api-key
```

Direct Cloud routes to `https://ollama.com/v1`. Use a model ID returned by
`https://ollama.com/api/tags`, not necessarily the local `:cloud` alias.
No OpenAI key or OpenAI sign-in is required. The selected model must support
the Codex tool-calling workflow.

## Limitations and performance

- Cloud `/v1/responses` is **stateless** and does not support
  `previous_response_id` / conversation IDs.
- Direct Cloud does **not** support built-in web search through Responses or
  freeform tool-call replay. The preset disables built-in web search.
- Local and Cloud may support different tool-calling, reasoning, and context
  capabilities. An API-compatible endpoint alone does not guarantee an end-to-end
  Codex Security scan works with every model.
- The default Ollama reasoning effort is `medium`; override with `--effort`
  only if the model accepts that value.
- For local inference, use a model context window of at least 64k, start with
  one standard scan, and monitor `ollama ps` and server load before increasing
  Deep Scan concurrency.
- Estimated scan costs for non-OpenAI models may be unavailable; do not rely on
  `--max-cost` to constrain local compute or Cloud spend without verifying
  provider-specific accounting.

## Smoke checks

```sh
curl --fail --silent http://127.0.0.1:11434/api/tags
curl --fail --silent https://ollama.com/api/tags
cs scan . --provider ollama --model gpt-oss:20b --mode standard
```

Local API errors and unsupported Responses features should fail visibly.
For API compatibility and model IDs, see [Ollama API overview](https://docs.ollama.com/api/introduction)
and [OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility).
