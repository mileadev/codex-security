import { expect, test } from "bun:test";
import {
  EXTERNAL_CODEX_PROVIDERS,
  isExternalModelProvider,
  mergedCodexConfig,
  scanProviderEnvKey,
} from "../src/config.js";
import {
  scanAuthentication,
  selectedScanEnvironment,
} from "../src/api.js";

const localConfig = { model_provider: "ollama", model: "gpt-oss:20b" };
const cloudConfig = { model_provider: "ollama-cloud", model: "gemma4:31b" };

test("Ollama Cloud uses direct OpenAI-compatible Responses with an isolated API key", () => {
  expect(EXTERNAL_CODEX_PROVIDERS["ollama-cloud"]).toMatchObject({
    base_url: "https://ollama.com/v1",
    wire_api: "responses",
    env_key: "OLLAMA_API_KEY",
  });
  expect(isExternalModelProvider("ollama-cloud")).toBe(true);
  expect(scanProviderEnvKey(cloudConfig)).toBe("OLLAMA_API_KEY");
  const env = {
    OLLAMA_API_KEY: "synthetic-ollama-key",
    OPENAI_API_KEY: "synthetic-openai-key",
    CODEX_API_KEY: "synthetic-codex-key",
  };
  expect(
    scanAuthentication(
      env,
      "auto",
      "ollama-cloud",
      false,
      false,
      "OLLAMA_API_KEY",
    ),
  ).toEqual({
    method: "api_key",
    source: "OLLAMA_API_KEY",
    verified: false,
  });
  const selected = selectedScanEnvironment(
    env,
    "auto",
    "ollama-cloud",
    "OLLAMA_API_KEY",
  );
  expect(selected["OLLAMA_API_KEY"]).toBe("synthetic-ollama-key");
  expect(selected["OPENAI_API_KEY"]).toBeUndefined();
  expect(selected["CODEX_API_KEY"]).toBeUndefined();
});

test("Ollama Cloud requires its own key, not an OpenAI key", () => {
  expect(() =>
    scanAuthentication(
      { OPENAI_API_KEY: "unrelated-key" },
      "auto",
      "ollama-cloud",
      false,
      false,
      "OLLAMA_API_KEY",
    ),
  ).toThrow("OLLAMA_API_KEY");
});

test("local Ollama needs no stored account or environment key", () => {
  expect(scanProviderEnvKey(localConfig)).toBeUndefined();
  expect(scanAuthentication({}, "auto", "ollama")).toEqual({
    method: "none",
    verified: false,
  });
  expect(
    scanAuthentication(
      { OPENAI_API_KEY: "unrelated-key" },
      "auto",
      "ollama",
    ),
  ).toEqual({
    method: "none",
    verified: false,
  });
  expect(() => scanAuthentication({}, "api-key", "ollama")).toThrow(
    "--auth auto",
  );
  expect(() => scanAuthentication({}, "chatgpt", "ollama")).toThrow(
    "--auth auto",
  );
  const isolated = selectedScanEnvironment(
    {
      OPENAI_API_KEY: "unrelated-key",
      CODEX_API_KEY: "another-key",
      OLLAMA_API_KEY: "separate-key",
      CODEX_OSS_BASE_URL: "http://private-host:11434/v1",
    },
    "auto",
    "ollama",
  );
  expect(isolated["OPENAI_API_KEY"]).toBeUndefined();
  expect(isolated["CODEX_API_KEY"]).toBeUndefined();
  expect(isolated["OLLAMA_API_KEY"]).toBeUndefined();
  expect(isolated["CODEX_OSS_BASE_URL"]).toBe("http://private-host:11434/v1");
});

test("Ollama model defaults do not assume OpenAI reasoning summary", async () => {
  for (const overrides of [localConfig, cloudConfig]) {
    const config = await mergedCodexConfig({ codexOverrides: overrides });
    expect(config["model_reasoning_summary"]).toBe("none");
    expect(config["model_reasoning_effort"]).toBe("medium");
  }
  const explicit = await mergedCodexConfig({
    codexOverrides: { ...cloudConfig, model_reasoning_effort: "low" },
  });
  expect(explicit["model_reasoning_effort"]).toBe("low");
});
