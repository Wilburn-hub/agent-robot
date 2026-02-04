# 贡献指南

感谢你愿意改进 AI 机器人周报。以下约定有助于我们更高效地协作。

## 开发准备

- 建议使用 Node.js LTS
- 安装依赖：`npm install`
- 启动开发：`npm run dev`

## 分支与提交

- 建议分支命名：`feat/xxx`、`fix/xxx`、`chore/xxx`
- 提交信息尽量简洁，说明改动目的

## 提交前检查

- 后端与前端功能自测
- 可选：`npm run build`
- 可选：`npm --prefix web run lint`

## PR 说明

- 说明改动背景、实现思路与影响范围
- 关联对应 Issue（如有）
- 如果涉及配置或接口变更，请同步更新 `docs/` 和 `README.md`
