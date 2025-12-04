Rust N-API 扩展（hash_sha256）

构建步骤（需要 Rust + cargo）：

1. 安装 Rust（https://rustup.rs/）并确保 `cargo` 可用。
2. 在项目根目录执行：
   - Windows: `cargo build --release --manifest-path native/rust-addon/Cargo.toml`
3. 构建完成后，将生成的 `.node` 文件复制到：
   `native/rust-addon/index.node`
   提示：使用 napi 默认产物名（例如 `rust_addon.node`）。

Electron 主进程会尝试加载该文件；若不存在则自动回退到 Node.js `crypto`。
