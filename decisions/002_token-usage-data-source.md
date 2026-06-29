# 002: Token 用量数据获取方案分析

日期: 2026-06-27
状态: 暂缓（待后续里程碑处理）

## 背景

AI Studio 需要在界面底部状态栏显示当前模型名称和 token 用量（类似 Hermes CLI 的 `deepseek-v-pro │ 17.4k/1M │ [  ] 2%`）。当前 HermesAdapter 使用 `hermes chat --cli -q --resume` 协议，不输出 token 用量信息。

## Hermes CLI 状态栏的数据流

```
API 响应 usage 字段
  ↓
conversation_loop.py:1603   agent.session_input_tokens += ...
  ↓                              ↓
context_compressor.update_from_response()   → last_prompt_tokens (当前上下文用量)
  ↓                              ↓
session DB (state.db)          context_length (来自 config / 模型元数据)
  ↓
cli.py:_get_status_bar_snapshot()
  → context_tokens  / context_length → "17.4k/1M"
  → context_percent → "2%"
  → model_short → "deepseek-v-pro"
  → _build_context_bar(percent) → "[  ]"
```

关键数据来源：
| 显示内容 | 变量 | 来源文件 |
|---------|------|---------|
| `deepseek-v-pro` | `agent.model` | run_agent.py |
| `17.4k` | `compressor.last_prompt_tokens` | agent/context_compressor.py:743 |
| `1M` | `compressor.context_length` | agent/context_compressor.py（配置） |
| `[  ]` | 百分比进度条 | cli.py:3780 _build_context_bar |
| `2%` | `last_prompt_tokens / context_length * 100` | cli.py:3927 |

每次 API 调用后 token 增量写入 `~/.hermes/state.db` 的 `sessions` 表：
- `input_tokens`, `output_tokens`（累计，非当前上下文用量）
- 不包含 `last_prompt_tokens` 或 `context_length`

## 方案对比

### 方案 A：读 session DB（推荐）

**原理**：每次 `hermes chat --cli -q` 进程退出后，读取 `~/.hermes/state.db` 获取 session 的累计 token 数据。

**能拿到什么**：
- model 名 ✓
- 累计 input/output/total tokens ✓
- context_length（需从 config 或模型元数据查）
- `last_prompt_tokens`（当前上下文用量）✗ — 不入库

**改动位置**：
1. `runtime-manager.ts` — 加 `readSessionTokens(sessionId)` 方法（SQLite 读）
2. `types.ts` — AgentEvent 加 `{type: "token_usage", ...}`
3. 不碰 HermesAdapter、不碰 ProcessAgentRuntime、不碰 IPC 协议

**代价**：~50 行新代码。需要 `better-sqlite3` 或 `sql.js`（Electron 主进程可用）。

**局限**：拿不到实时"当前上下文用量"，只有累计数据。对于 GUI 状态栏，显示"本次会话已用 17.4k / 上限 1M" 已经够用。

---

### 方案 B：解析 verbose 输出

**原理**：`buildCommand` 加 `--verbose`，`parseLine` 匹配 token 日志行。

**能拿到什么**：
- 每次 API 调用的 prompt_tokens、completion_tokens、total_tokens ✓
- 实时，非累计 ✓

**改动位置**：
1. `hermes-adapter.ts` — `buildCommand` 加 `--verbose`，`parseLine` 加 regex
2. `types.ts` — 同上

**代价**：~15 行新代码。但 verbose 输出大量额外信息需过滤，可能遗漏或误匹配。

**风险**：verbose 输出格式是 Hermes 内部实现细节，非稳定 API，未来版本可能变化。

---

### 方案 C：ACP 协议

**原理**：Hermes 内置的 ACP (Agent Client Protocol) server 通过 WebSocket 推送结构化的 `UsageUpdate` 事件：`{session_update: "usage_update", size: 1000000, used: 17400}`。

**能拿到什么**：全部，且是结构化数据、实时推送。

**代价**：这是**跨里程碑的重构**，不是小功能：
1. 安装 `agent-client-protocol==0.9.0`（当前未安装）
2. 通信层从 `spawn("hermes", ["chat", "--cli", "-q", ...])` 改为 WebSocket 连接 `hermes acp`
3. `ProcessAgentRuntime`（subprocess+stdout 模型）不再适用，需重写
4. 需实现 ACP session 生命周期：initialize → new_session → set_session_model → new_prompt → session_update ...
5. RuntimeManager、IPC 层、preload 桥接全部受影响

**定位**：ACP 是 IDE 集成的"正确"长期方案，但不是 token 状态栏这个小功能的合理载体。适合作为独立里程碑在架构升级时统一迁移。

---

## 推荐

**方案 A（读 session DB）** — 理由：
1. 旁路读取，不侵入现有协议（`hermes chat --cli -q --resume` 完全不动）
2. 不依赖 Hermes 内部输出格式（方案 B 的风险）
3. 将来切换到 ACP 后仍可作为 fallback
4. 改动量可控（~50 行，只涉及 RuntimeManager + types）

## 暂缓原因

当前优先级的里程碑不包含状态栏增强。此分析存档于此，后续处理时可直接参考。
