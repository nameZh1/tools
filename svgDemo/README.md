# SVG 配电开关潮流演示

## 1. 文件说明

| 文件 | 作用 |
| --- | --- |
| [`index.html`](./index.html) | HTML5 页面、SVG 单线图、控制面板和样式 |
| [`power-switch.js`](./power-switch.js) | 状态模型、数据校验、SVG 渲染和交互事件 |

页面没有构建步骤和第三方运行时依赖，直接打开 `index.html` 即可使用。

## 2. 数据结构

当前状态由 `power-switch.js` 中的单一 `state` 对象维护。初始值如下：

```js
{
  sourceOn: true,
  straightClosed: true,
  activeBranch: "A",
  flowEnabled: true,
  flowDirection: "forward",
  flowSpeed: 1
}
```

字段定义：

| 字段 | 类型 | 可选值或范围 | 含义 |
| --- | --- | --- | --- |
| `sourceOn` | `boolean` | `true` / `false` | 电源是否送电。停电时整条回路失电且不产生潮流动画 |
| `straightClosed` | `boolean` | `true` / `false` | 直线主开关 QF1 是否合闸 |
| `activeBranch` | `string` | `"A"` / `"B"` | 一分二互锁开关 QS1 当前合闸的支路，始终只有一个值 |
| `flowEnabled` | `boolean` | `true` / `false` | 是否显示潮流动画。关闭时仍保留带电状态 |
| `flowDirection` | `string` | `"forward"` / `"reverse"` | 潮流方向。正向为电源侧到负荷侧，反向为负荷侧到电源侧 |
| `flowSpeed` | `number` | `0.5` 到 `2` | 动画速度倍率，步进为 `0.1`。数值越大，虚线移动越快 |

`setData` 接收部分字段即可，未传入的字段保持原值。三个布尔字段会使用 `Boolean(value)` 转换，因此调用方应传入真正的布尔值，避免字符串 `"false"` 被转换为 `true`。`activeBranch` 和 `flowDirection` 会转成大写或小写后校验，`flowSpeed` 会转成数字；参数不是对象时抛出 `TypeError`，非法枚举值或速度范围抛出 `RangeError`，且不会提交不完整状态。

## 3. 数据控制方式

### 3.1 JavaScript API

```js
// 只更新需要变化的字段
window.powerDiagram.setData({
  sourceOn: true,
  straightClosed: true,
  activeBranch: "B",
  flowDirection: "reverse",
  flowSpeed: 1.4
});

// 读取当前状态。返回的是新对象，不应直接修改它
const current = window.powerDiagram.getData();

// 恢复默认状态
window.powerDiagram.reset();
```

`setData` 会返回更新后的状态对象。推荐业务代码只调用这三个 API，不要直接操作 SVG 的 class 或属性。

### 3.2 自定义事件

不方便直接持有 `window.powerDiagram` 时，可以发送事件：

```js
window.dispatchEvent(new CustomEvent("power-diagram:set-data", {
  detail: {
    sourceOn: true,
    straightClosed: false,
    activeBranch: "A",
    flowEnabled: false
  }
}));
```

每次状态更新后，页面会派发 `power-diagram:change`：

```js
window.addEventListener("power-diagram:change", (event) => {
  const { source, data } = event.detail;
  // source: external、control、diagram、event 或 reset
  console.log(source, data);
});
```

### 3.3 页面控件和图元操作

- 右侧复选开关控制 `sourceOn`、`straightClosed`、`flowEnabled`。
- A/B 分段按钮只切换 `activeBranch`，不会出现两路同时合闸。
- 正向/反向按钮切换 `flowDirection`，速度滑杆更新 `flowSpeed`。
- SVG 中的 QF1、QS1、负荷 A、负荷 B 都可点击；键盘聚焦后按 `Enter` 或空格也能操作。

这些入口最终都会调用 `setData`，因此状态、文字、颜色、动画和数据快照始终同步。

## 4. 实现原理

### 4.1 状态计算

`render()` 每次从完整状态重新计算派生状态：

```js
const mainEnergized = state.sourceOn && state.straightClosed;
const branchAEnergized = mainEnergized && state.activeBranch === "A";
const branchBEnergized = mainEnergized && state.activeBranch === "B";
const flowRunning = mainEnergized && state.flowEnabled;
```

因此：

1. 电源停运时，主回路和两条支路不显示潮流。
2. QF1 分闸时，电源侧导线仍可标记为带电，但下游失电且没有潮流。
3. QF1 合闸后，只有 `activeBranch` 对应的负荷带电和流动。
4. QS1 用单个 `activeBranch` 枚举表示，天然保证一开一合。

### 4.2 SVG 图元映射

| SVG ID | 控制内容 | 主要状态 class / 属性 |
| --- | --- | --- |
| `sourceLine`、`mainLine` | 电源侧和主回路导线 | `.is-live` |
| `branchALine`、`branchBLine` | A/B 支路导线 | `.is-live` |
| `straightBlade` | 直线开关刀闸 | `.is-open`、`.is-live` |
| `branchBlade` | 一分二开关刀闸 | `.to-a`、`.to-b`、`.is-live` |
| `sourceCircle`、`sourceWave` | 电源符号 | `.is-live` |
| `loadABox`、`loadBBox` | 负荷状态 | `.is-selected`、`.is-live` |
| `flowPathA`、`flowPathB` | A/B 潮流路径 | `.is-flowing`、`.is-reverse`、`marker-start/end` |

普通导线通过 `.is-live` 改变颜色。直线刀闸以左触点为旋转原点，分闸时增加 `rotate(-31deg)`；分支刀闸以公共触点为原点，通过 `.to-a` / `.to-b` 旋转到对应触点。

### 4.3 潮流动画

潮流路径是覆盖在导线上的 SVG `path`，使用蓝色短虚线和 CSS `stroke-dashoffset` 动画：

- `flowDirection: "forward"`：设置 `marker-end`，虚线向负荷侧移动。
- `flowDirection: "reverse"`：设置 `marker-start`，虚线向电源侧移动，并使用反向 keyframe。
- 动画时长为 `1.15 / flowSpeed` 秒。
- `prefers-reduced-motion: reduce` 下停止连续动画，保留静态虚线和方向箭头。

这种方式不依赖定时器或逐帧修改 DOM，切换状态时只更新 class、SVG marker 和 CSS 变量。

### 4.4 状态更新链路

```text
页面控件 / SVG 点击 / 外部 API
            |
            v
      normalizePatch()
            |
            v
          state
            |
            v
          render()
            |
            +--> SVG class、transform、marker
            +--> 控件 checked、aria-pressed、文本
            +--> 状态快照与 power-diagram:change
```

## 5. 开发规范

### 状态与 API

1. 所有状态变化必须经过 `setData`，禁止在业务代码中直接改 `state` 或 SVG class。
2. 新增字段时同步修改默认值、`normalizePatch()`、`render()`、数据快照和本文件的数据表。
3. 枚举字段必须在 `normalizePatch()` 中校验；互锁关系不能依赖按钮样式来保证。
4. `getData()` 返回副本。调用方不得把返回对象当作可变 store。
5. 对外事件名称保持 `power-diagram:` 前缀，事件 `detail` 结构保持稳定。

### SVG 与样式

1. SVG 保持明确的 `width`、`height` 和 `viewBox`，避免加载或缩放时布局跳动。
2. 新图元使用稳定、语义化的 ID，并同时更新 `elements` 映射和本表。
3. 状态优先使用 `.is-live`、`.is-selected` 等 class 表达，颜色不能成为唯一状态提示，必须同步更新文字或 ARIA 属性。
4. 动画只使用 transform、opacity、stroke-dashoffset 等可控属性；不要新增轮询、定时器或无限 JS 循环。
5. 新增动画必须提供 `prefers-reduced-motion` 降级行为。

### 交互与响应式

1. 新增按钮、开关和滑杆的实际触控区域至少为 44px，并提供 `:focus-visible` 样式。
2. SVG 图元按钮必须有 `role`、`aria-label` 和 Enter/空格键行为。
3. 页面在窄屏下允许图表容器内部横向查看，但不能造成页面级横向溢出；控制面板应降为单列。
4. 状态切换时同时检查运行、停电、主开关分闸、动画暂停、A 路和 B 路六类显示。

### 资源与安全

1. 当前页面没有定时器、网络订阅或 WebSocket；事件监听器只在页面初始化时注册一次。
2. 如果将脚本改造成 SPA 组件，必须增加卸载函数，移除 `window` 和 SVG 事件监听器，并停止动画。
3. 外部数据只进入经过校验的状态字段；渲染文本使用 `textContent`，不要改用 `innerHTML` 或 `eval`。
4. 保持无第三方依赖和无构建步骤，避免为单线图引入不必要的运行时库。

## 6. 修改后的检查清单

- `node --check svgDemo/power-switch.js`
- 检查 HTML ID 唯一，且 JS 的 `getElementById` 引用全部存在。
- 手动验证 QF1 分合闸、QS1 A/B 互锁、电源停运、潮流正反向和速度变化。
- 检查键盘操作、窄屏布局、`prefers-reduced-motion` 和浏览器控制台无新增错误。
