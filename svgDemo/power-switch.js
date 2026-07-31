(function () {
  "use strict";

  const DEFAULT_STATE = Object.freeze({
    sourceOn: true,
    straightClosed: true,
    activeBranch: "A",
    flowEnabled: true,
    flowDirection: "forward",
    flowSpeed: 1
  });

  const state = { ...DEFAULT_STATE };
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  const elements = {
    systemStateDot: document.getElementById("systemStateDot"),
    systemStateText: document.getElementById("systemStateText"),
    sourceCircle: document.getElementById("sourceCircle"),
    sourceWave: document.getElementById("sourceWave"),
    sourceLine: document.getElementById("sourceLine"),
    mainLine: document.getElementById("mainLine"),
    branchALine: document.getElementById("branchALine"),
    branchBLine: document.getElementById("branchBLine"),
    sourceSvgState: document.getElementById("sourceSvgState"),
    straightControl: document.getElementById("straightSwitchControl"),
    straightContactLeft: document.getElementById("straightContactLeft"),
    straightContactRight: document.getElementById("straightContactRight"),
    straightBlade: document.getElementById("straightBlade"),
    straightSvgState: document.getElementById("straightSvgState"),
    branchControlSvg: document.getElementById("branchSwitchControl"),
    branchContactCommon: document.getElementById("branchContactCommon"),
    branchContactA: document.getElementById("branchContactA"),
    branchContactB: document.getElementById("branchContactB"),
    branchBlade: document.getElementById("branchBlade"),
    branchSvgState: document.getElementById("branchSvgState"),
    loadAControl: document.getElementById("loadAControl"),
    loadBControl: document.getElementById("loadBControl"),
    loadABox: document.getElementById("loadABox"),
    loadBBox: document.getElementById("loadBBox"),
    loadABars: [document.getElementById("loadABar1"), document.getElementById("loadABar2")],
    loadBBars: [document.getElementById("loadBBar1"), document.getElementById("loadBBar2")],
    flowPathA: document.getElementById("flowPathA"),
    flowPathB: document.getElementById("flowPathB"),
    sourceMetric: document.getElementById("sourceMetric"),
    straightMetric: document.getElementById("straightMetric"),
    branchMetric: document.getElementById("branchMetric"),
    flowMetric: document.getElementById("flowMetric"),
    sourceToggle: document.getElementById("sourceToggle"),
    straightToggle: document.getElementById("straightToggle"),
    flowToggle: document.getElementById("flowToggle"),
    sourceControlState: document.getElementById("sourceControlState"),
    straightControlState: document.getElementById("straightControlState"),
    flowControlState: document.getElementById("flowControlState"),
    branchButtons: [...document.querySelectorAll("[data-branch]")],
    directionButtons: [...document.querySelectorAll("[data-direction]")],
    flowSpeed: document.getElementById("flowSpeed"),
    flowSpeedValue: document.getElementById("flowSpeedValue"),
    dataSnapshot: document.getElementById("dataSnapshot")
  };

  function setClass(element, className, enabled) {
    element.classList.toggle(className, enabled);
  }

  function setFlowMarker(path, direction) {
    const isReverse = direction === "reverse";
    setClass(path, "is-reverse", isReverse);
    path.removeAttribute(isReverse ? "marker-end" : "marker-start");
    path.setAttribute(isReverse ? "marker-start" : "marker-end", "url(#flowArrow)");
  }

  function render() {
    const mainEnergized = state.sourceOn && state.straightClosed;
    const branchAEnergized = mainEnergized && state.activeBranch === "A";
    const branchBEnergized = mainEnergized && state.activeBranch === "B";
    const flowRunning = mainEnergized && state.flowEnabled;

    setClass(elements.sourceCircle, "is-live", state.sourceOn);
    setClass(elements.sourceWave, "is-live", state.sourceOn);
    setClass(elements.sourceLine, "is-live", state.sourceOn);
    elements.sourceSvgState.textContent = state.sourceOn ? "运行" : "停运";

    setClass(elements.straightContactLeft, "is-live", state.sourceOn);
    setClass(elements.straightContactRight, "is-live", mainEnergized);
    setClass(elements.straightBlade, "is-open", !state.straightClosed);
    setClass(elements.straightBlade, "is-live", mainEnergized);
    elements.straightSvgState.textContent = state.straightClosed ? "合闸" : "分闸";
    elements.straightControl.setAttribute("aria-pressed", String(state.straightClosed));
    elements.straightControl.setAttribute("aria-label", `直线主开关，当前${state.straightClosed ? "合闸" : "分闸"}，按下切换`);

    setClass(elements.mainLine, "is-live", mainEnergized);
    setClass(elements.branchALine, "is-live", branchAEnergized);
    setClass(elements.branchBLine, "is-live", branchBEnergized);
    setClass(elements.branchContactCommon, "is-live", mainEnergized);
    setClass(elements.branchContactA, "is-selected", state.activeBranch === "A");
    setClass(elements.branchContactB, "is-selected", state.activeBranch === "B");
    setClass(elements.branchContactA, "is-live", branchAEnergized);
    setClass(elements.branchContactB, "is-live", branchBEnergized);
    setClass(elements.branchBlade, "to-a", state.activeBranch === "A");
    setClass(elements.branchBlade, "to-b", state.activeBranch === "B");
    setClass(elements.branchBlade, "is-live", mainEnergized);
    elements.branchSvgState.textContent = state.activeBranch === "A" ? "A 合 / B 分" : "A 分 / B 合";
    elements.branchControlSvg.setAttribute("aria-label", `一分二互锁开关，当前${state.activeBranch}路合闸，按下切换支路`);

    setClass(elements.loadABox, "is-selected", state.activeBranch === "A");
    setClass(elements.loadBBox, "is-selected", state.activeBranch === "B");
    setClass(elements.loadABox, "is-live", branchAEnergized);
    setClass(elements.loadBBox, "is-live", branchBEnergized);
    elements.loadABars.forEach((bar) => setClass(bar, "is-live", branchAEnergized));
    elements.loadBBars.forEach((bar) => setClass(bar, "is-live", branchBEnergized));
    elements.loadAControl.setAttribute("aria-pressed", String(state.activeBranch === "A"));
    elements.loadBControl.setAttribute("aria-pressed", String(state.activeBranch === "B"));

    const duration = `${(1.15 / state.flowSpeed).toFixed(3)}s`;
    [elements.flowPathA, elements.flowPathB].forEach((path) => {
      path.style.setProperty("--flow-duration", duration);
      setFlowMarker(path, state.flowDirection);
    });
    setClass(elements.flowPathA, "is-flowing", flowRunning && state.activeBranch === "A");
    setClass(elements.flowPathB, "is-flowing", flowRunning && state.activeBranch === "B");

    elements.sourceToggle.checked = state.sourceOn;
    elements.straightToggle.checked = state.straightClosed;
    elements.flowToggle.checked = state.flowEnabled;
    elements.flowSpeed.value = String(state.flowSpeed);
    elements.flowSpeed.setAttribute("aria-valuetext", `${state.flowSpeed.toFixed(1)} 倍速`);
    elements.flowSpeedValue.value = `${state.flowSpeed.toFixed(1)}x`;
    elements.flowSpeedValue.textContent = `${state.flowSpeed.toFixed(1)}x`;

    elements.branchButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.branch === state.activeBranch));
    });
    elements.directionButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.direction === state.flowDirection));
    });

    elements.sourceControlState.textContent = state.sourceOn ? "已送电" : "已停电";
    elements.straightControlState.textContent = state.straightClosed ? "合闸" : "分闸";
    elements.flowControlState.textContent = state.flowEnabled ? "运行" : "暂停";
    elements.sourceMetric.textContent = state.sourceOn ? "已送电" : "已停电";
    elements.straightMetric.textContent = state.straightClosed ? "合闸" : "分闸";
    elements.branchMetric.textContent = `${state.activeBranch} 路`;

    if (!state.sourceOn) {
      elements.flowMetric.textContent = "无电源";
      elements.systemStateText.textContent = "电源停运";
      elements.systemStateDot.className = "status-dot";
    } else if (!state.straightClosed) {
      elements.flowMetric.textContent = "回路断开";
      elements.systemStateText.textContent = "主开关分闸";
      elements.systemStateDot.className = "status-dot is-warning";
    } else {
      const directionText = state.flowDirection === "forward" ? "正向" : "反向";
      elements.flowMetric.textContent = state.flowEnabled ? `${directionText} · ${state.flowSpeed.toFixed(1)}x` : "动画暂停";
      elements.systemStateText.textContent = `${state.activeBranch} 路带电运行`;
      elements.systemStateDot.className = "status-dot is-running";
    }

    elements.dataSnapshot.textContent = JSON.stringify(getData(), null, 2);
  }

  function normalizePatch(patch) {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new TypeError("powerDiagram.setData() 需要传入对象");
    }

    const normalized = {};

    if (own(patch, "sourceOn")) {
      normalized.sourceOn = Boolean(patch.sourceOn);
    }
    if (own(patch, "straightClosed")) {
      normalized.straightClosed = Boolean(patch.straightClosed);
    }
    if (own(patch, "flowEnabled")) {
      normalized.flowEnabled = Boolean(patch.flowEnabled);
    }
    if (own(patch, "activeBranch")) {
      const activeBranch = String(patch.activeBranch).toUpperCase();
      if (activeBranch !== "A" && activeBranch !== "B") {
        throw new RangeError("activeBranch 只能是 A 或 B");
      }
      normalized.activeBranch = activeBranch;
    }
    if (own(patch, "flowDirection")) {
      const direction = String(patch.flowDirection).toLowerCase();
      if (direction !== "forward" && direction !== "reverse") {
        throw new RangeError("flowDirection 只能是 forward 或 reverse");
      }
      normalized.flowDirection = direction;
    }
    if (own(patch, "flowSpeed")) {
      const speed = Number(patch.flowSpeed);
      if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) {
        throw new RangeError("flowSpeed 必须是 0.5 到 2 之间的数字");
      }
      normalized.flowSpeed = Math.round(speed * 10) / 10;
    }

    return normalized;
  }

  function getData() {
    return { ...state };
  }

  function setData(patch, source = "external") {
    Object.assign(state, normalizePatch(patch));
    render();

    window.dispatchEvent(new CustomEvent("power-diagram:change", {
      detail: {
        source,
        data: getData()
      }
    }));

    return getData();
  }

  function handleKeyboardAction(element, action) {
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });
  }

  elements.sourceToggle.addEventListener("change", (event) => {
    setData({ sourceOn: event.currentTarget.checked }, "control");
  });
  elements.straightToggle.addEventListener("change", (event) => {
    setData({ straightClosed: event.currentTarget.checked }, "control");
  });
  elements.flowToggle.addEventListener("change", (event) => {
    setData({ flowEnabled: event.currentTarget.checked }, "control");
  });
  elements.flowSpeed.addEventListener("input", (event) => {
    setData({ flowSpeed: event.currentTarget.value }, "control");
  });

  elements.branchButtons.forEach((button) => {
    button.addEventListener("click", () => setData({ activeBranch: button.dataset.branch }, "control"));
  });
  elements.directionButtons.forEach((button) => {
    button.addEventListener("click", () => setData({ flowDirection: button.dataset.direction }, "control"));
  });

  const toggleStraightSwitch = () => setData({ straightClosed: !state.straightClosed }, "diagram");
  const toggleBranch = () => setData({ activeBranch: state.activeBranch === "A" ? "B" : "A" }, "diagram");
  const selectBranchA = () => setData({ activeBranch: "A" }, "diagram");
  const selectBranchB = () => setData({ activeBranch: "B" }, "diagram");

  elements.straightControl.addEventListener("click", toggleStraightSwitch);
  elements.branchControlSvg.addEventListener("click", toggleBranch);
  elements.loadAControl.addEventListener("click", selectBranchA);
  elements.loadBControl.addEventListener("click", selectBranchB);
  handleKeyboardAction(elements.straightControl, toggleStraightSwitch);
  handleKeyboardAction(elements.branchControlSvg, toggleBranch);
  handleKeyboardAction(elements.loadAControl, selectBranchA);
  handleKeyboardAction(elements.loadBControl, selectBranchB);

  window.addEventListener("power-diagram:set-data", (event) => {
    setData(event.detail, "event");
  });

  window.powerDiagram = Object.freeze({
    setData,
    getData,
    reset: () => setData(DEFAULT_STATE, "reset")
  });

  render();
}());
