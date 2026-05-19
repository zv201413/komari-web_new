# 🔒 komari-web_new 技术深度总结

**项目状态**: Completed & Verified (v1.3.0)
**更新日期**: 2026-05-19
**技术栈**: React → TypeScript → Vite → i18next

---

## 1. 项目背景与目标

Komari Web 监控前端，支持多语言、动态 CPU 核心数显示以及响应式卡片布局

---

## 2. 核心架构设计

- Vite
- React
- TypeScript

---

## 3. 开发日志 (最近更新)

### [2026-05-19] patch - 优化 CPU 核心数动态显示并适配 float64

| 字段 | 内容 |
|:---|:---|
| 问题 | CPU 进度条只显示 CPU 字段，看不到服务器是几核；在 float64 核心数（如 0.5核）情况下无法正确展示 |
| 解法 | 修改 Node.tsx 标签逻辑，提取 basic.cpu_cores；整数直接显示 N核，小数调用 toFixed(1) 展示为小数核数；新增中、英、日、繁体 cores 翻译键 |

---

**文档性质**: 本地私密归档
**生成时间**: 2026-05-19 15:28:42
