# Changelog

All notable changes to the neuralcontrol MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-03-27

### ✨ Added
- **Feature Flags Tools**: 
    - `get_feature_flags`: List all flags for a service.
    - `set_feature_flag`: Create or update flag rollouts (0-100%).
- **Distributed Tracing Tool**:
    - `get_trace`: Fetch full waterfall traces by `trace_id`.
- **Enhanced Documentation Tools**: `get_feature_documentation` now covers `feature_flags`, `tracing`, and `request_coalescing`.
- **AI-Guided Setup**: `get_sdk_setup_instructions` now proactively suggests advanced feature documentation.

### 📝 Prompts
- Updated `integration_helper` to include `featureFlags: true` and `tracing: true` in the default snippet.
- Enhanced route handler templates with `withEndpointTimeout`, `startSpan`, and `isEnabled` usage.

---

## [1.1.0] - 2026-03-15

### ✨ Added
- Initial release of `neuralcontrol-mcp`.
- Tools for: `get_endpoint_config`, `get_recent_metrics`, `get_open_incidents`, `get_active_overrides`, `create_threshold_override`, `get_ai_thresholds`, `get_all_ai_insights`.
- **SDK Documentation Support**: Tools to read setup instructions and feature guides.
- **Smart Prompts**: Template for common integration patterns.
