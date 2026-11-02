# 回车保存与确认

保存、确认和确定操作默认支持回车，按当前编辑区域或最上层弹窗选择操作。

单行输入框按 Enter 提交当前保存；没有输入框的确认弹窗默认聚焦确认按钮，打开后
可以直接按 Enter。主动通过鼠标或 Tab 聚焦取消按钮后，Enter 仍执行取消。
备注、脚本等多行文本保留 Enter 换行，终端和下拉选择使用自己的键盘操作。
中文输入法选词、长按回车、带修饰键的回车不触发额外保存；禁用或忙碌按钮不接受提交。

## 组件约定

优先使用原生 `<form onSubmit>` 和 `type="submit"`，保留浏览器的必填字段校验。
没有表单的操作按钮声明 `data-enter-submit`，由
[`defaultEnter.ts`](../src/utils/defaultEnter.ts) 统一处理，无需在每个输入框复制键盘回调。

```tsx
<div data-enter-scope>
  <TextField.Root value={name} onChange={handleChange} />
  <Button data-enter-submit disabled={saving} onClick={save}>保存</Button>
</div>
```

- `data-enter-scope` 标记独立编辑区域，防止本区没有可用操作时误提交其他区域。
- 同一区域顶部和底部的同一个保存按钮可使用相同的非空键，例如
  `data-enter-submit="theme-settings"`，只调用其中一个按钮。
- 同一区域有不同操作时，可用 `data-enter-primary` 指定唯一默认操作；否则不猜测。
- `data-enter-ignore` 用于需要自己处理回车的控件。
- `SettingCardButton` 的保存用法传入 `enterSubmit`；测试、导出等其他按钮不默认声明。
- 自定义 `onKeyDown` 已消费回车时调用 `preventDefault()`，统一处理会尊重它。

共享设置输入框隐藏自己的保存按钮时，回车向外交给统一保存按钮，不再被隐藏按钮吞掉。
弹窗内的回车不会提交背景页面或另一层弹窗；判断不依赖按钮中文或翻译结果。

## 验证

本轮检查覆盖默认前端的管理设置、节点编辑、批量任务与通知、主题管理、账号与会话、
数据库引导页和终端验证，也同步了 Deer 保留的编辑组件与登录表单。
浏览器验证覆盖原生表单、无表单编辑、隐藏保存按钮、独立区域、弹窗与嵌套弹窗、
输入法合成事件、多行换行、禁用按钮和监听器清理。

修改前端源码后，需要重新构建默认前端并发布服务端或 Docker 镜像才会影响运行中的站点。
Deer 则需重新构建并上传主题包。
