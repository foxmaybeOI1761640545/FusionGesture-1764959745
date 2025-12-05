# Fusion Gesture

基于 **WebGL + TensorFlow.js + React** 的实时手势驱动粒子特效实验项目。  
打开摄像头，伸出你的手，让粒子尾迹、漩涡云和能量爆裂在屏幕中跟随手势跳舞。

> 👋 适合用来做交互 Demo、毕业设计展示、创意网页背景等。

---

## ✨ 功能特性

- **实时手势识别**
  - 使用浏览器摄像头和 `@tensorflow-models/handpose` 检测手部关键点
  - 粗略分类：张开手（open）、握拳（fist）、捏取（pinch）、空闲（idle）
  - 输出手部归一化坐标，驱动粒子中心移动

- **GPU 粒子特效（Three.js）**
  - 在 WebGL 中绘制成千上万粒子
  - 支持三种视觉风格：
    - `Glowing Trail`：光点尾迹跟随手
    - `Swirling Cloud`：围绕手势的漩涡云
    - `Energy Burst`：从手部向外爆裂的能量流

- **交互式控制面板**
  - 调节粒子 **强度**（数量 / 运动剧烈程度）
  - 调节粒子 **颜色**
  - 切换 **效果类型**（trail/swirl/burst）
  - 切换 **性能模式**（高 / 均衡 / 低）

- **HUD & 状态显示**
  - 显示当前识别出的手势类型
  - 显示渲染 FPS
  - 显示手势识别模型加载 & 摄像头状态

- **跨平台**
  - 桌面浏览器、支持 WebGL 的手机浏览器均可使用
  - 布局为响应式：大屏左右分栏，小屏上下布局

---

## 🧱 技术栈

- **前端框架**：React 18
- **3D & 粒子**：Three.js
- **模型推理**：
  - `@tensorflow-models/handpose@0.0.7`
  - `@tensorflow/tfjs-core@^3.21.0`
  - `@tensorflow/tfjs-backend-webgl@^3.21.0`
- **构建工具**：Webpack 5 + Babel

> 注意：`handpose` 要求的 tfjs 版本是 3.x，因此本项目中使用的是 3.21.0，如果换成 4.x 会导致依赖冲突（`ERESOLVE`）。

---

## 📦 环境要求

- Node.js：推荐 **>= 18**
- npm：自带即可
- 支持 WebGL 的现代浏览器（Chrome / Edge / Firefox / 新版 Safari 等）
- 设备有摄像头（PC / 笔记本 / 手机）

---

## 🚀 快速开始

以下操作假设你已经在项目根目录（包含 `package.json` 的那个目录）：

### 1. 安装依赖

> 如果之前已经装过、报了错误，建议先删除旧依赖再重装：

~~~bash
# PowerShell / CMD 下
rm -r node_modules
del package-lock.json
~~~

然后重新安装：

~~~bash
npm install
~~~

> 如果你的 npm 版本比较“严格”，仍旧报 peer dependency 的错误，可以使用：

~~~bash
npm install --legacy-peer-deps
~~~

### 2. 启动开发服务器

~~~bash
npm run start
~~~

* 默认会启动 `webpack-dev-server`，并自动打开浏览器。
* 如果没有自动打开，可以手动访问：

~~~text
http://localhost:8080
~~~

### 3. 允许摄像头权限

第一次打开页面时，浏览器会弹出权限请求：

* 请选择 **允许使用摄像头（Allow camera）**
* 否则手势识别无法工作，页面会一直显示“无法访问摄像头”。

---

## 🕹 使用说明

打开页面后，你会看到：

* 左侧（或上方）：黑色星空背景上的粒子特效 + HUD 信息；
* 右侧（或下方）：控制面板和状态栏；
* 左下角：摄像头预览窗口（镜像展示，类似自拍）。

### 1. 基本操作

1. 保证你在摄像头前，光线适中，手不要太靠近镜头。
2. 将手伸入摄像头画面区域。
3. 观察 HUD、Status 卡片中显示的当前 **Gesture** 与 **FPS**。
4. 在右侧控制面板中尝试调整：

   * 粒子强度（Particle Intensity）
   * 粒子颜色（Particle Color）
   * 效果类型（Effect Style）
   * 性能模式（Performance Mode）

### 2. 手势类型说明

当前内置的简单手势分类逻辑大致如下（基于关键点距离的粗略判断）：

* **Open Hand (`open`)**

  * 手掌张开，五指分开或自然伸直
  * 粒子继续跟随手部位置运动
* **Fist (`fist`)**

  * 握拳时，五指指尖更靠近手腕
  * 在粒子系统里会加大力量系数，运动更剧烈
* **Pinch (`pinch`)**

  * 拇指指尖与食指指尖距离较近时
  * 粒子整体尺度会略微缩小，偏向“收束效果”
* **Idle (`idle`)**

  * 没检测到明显手部或手在画面外、模型不确定时
  * 粒子缓慢漂浮，类似背景星云

> 当前版本对 “左右挥手（wave）” 没有做复杂判定逻辑，仅保留了接口，你可以后续自行扩展成真正的挥手识别。

---

## 🌌 粒子效果 & 控制面板

### 1. Effect Style（效果类型）

* **Glowing Trail (`trail`)**

  * 粒子被吸向手部位置，形成光点尾迹
  * 类似“鼠标跟随 + 尾焰”的效果
* **Swirling Cloud (`swirl`)**

  * 粒子围绕手部位置旋转，同时有一点向内吸引
  * 形成小型漩涡云团，适合展示“灵力聚集”的感觉
* **Energy Burst (`burst`)**

  * 粒子从手部向外喷射
  * 适合在握拳或用力动作时展示爆裂感

### 2. Particle Intensity（强度）

* 控制粒子数量 + 运动幅度。
* 范围 `20% ~ 100%`，数值越高：

  * GPU 压力越大；
  * 画面越饱满、越炫。

### 3. Performance Mode（性能模式）

* **High（高）**

  * 粒子更密集、更亮
  * 推荐桌面显卡 / 性能较好的设备
* **Balanced（均衡）**

  * 适中折中，默认模式
* **Low（低）**

  * 部分粒子更新帧率降低 + 粒子尺寸略小
  * 适合低端设备 / 手机浏览器

---

## 📁 项目结构

~~~text
fusion-gesture/
├─ package.json          # 项目依赖与脚本
├─ webpack.config.js     # Webpack 配置
├─ .babelrc              # Babel 配置
├─ public/
│  └─ index.html         # HTML 模板
└─ src/
   ├─ index.jsx          # React 入口
   ├─ App.jsx            # 根组件，组装粒子画布和控制面板
   ├─ hooks/
   │  └─ useGestureDetector.js   # 手势识别 Hook，封装 handpose + 摄像头
   ├─ components/
   │  ├─ GestureVisualizer.jsx  # HUD：显示手势类型、FPS 等
   │  ├─ ParticleCanvas.jsx     # Three.js 粒子场景容器
   │  └─ ControlPanel.jsx       # 控制面板 UI
   ├─ particles/
   │  └─ ParticleSystem.js      # 粒子系统核心逻辑
   └─ styles/
      ├─ global.css             # 全局样式、背景等
      └─ App.css                # 布局和组件样式
~~~

---

## 📱 移动端使用注意事项

* 推荐使用 **手机自带浏览器** 或 Chrome/Edge（部分内置浏览器可能拦截摄像头 / WebGL）。
* 避免开启 **低电量模式 / 超省电模式**，可能会限制帧率。
* 确保连接 Wi-Fi 或流量信号较好，以减少浏览器资源调度的卡顿。
* 如果出现明显卡顿：

  * 将 Performance Mode 切换为 **Low**
  * 降低 Particle Intensity（比如调到 40% 以下）

---

## 🛠 常见问题排查 (FAQ)

### 1. `npm ERR! ERESOLVE unable to resolve dependency tree`

典型报错片段：

~~~text
Found: @tensorflow/tfjs-backend-webgl@4.22.0
Could not resolve dependency:
peer @tensorflow/tfjs-backend-webgl@"^3.0.0" from @tensorflow-models/handpose@0.0.7
~~~

**原因：**

* `handpose@0.0.7` 的 peer 依赖要求 `@tensorflow/tfjs-backend-webgl` 为 **3.x**；
* 如果你装了 4.x，就会冲突。

**解决办法：**

确保 `package.json` 中依赖如下（3.21.0 可以用）：

~~~json
"@tensorflow-models/handpose": "^0.0.7",
"@tensorflow/tfjs-backend-webgl": "^3.21.0",
"@tensorflow/tfjs-core": "^3.21.0"
~~~

然后重新安装：

~~~bash
rm -r node_modules
del package-lock.json
npm install
# 或者
npm install --legacy-peer-deps
~~~

---

### 2. `'webpack-dev-server' 不是内部或外部命令`

典型报错：

~~~text
'webpack-dev-server' 不是内部或外部命令，也不是可运行的程序或批处理文件。
~~~

**原因：**

* 由于上一步依赖冲突，`npm install` 没有成功完成，导致未安装 `webpack-dev-server`；
* 你直接运行 `npm run start` 时，根本找不到这个二进制。

**解决办法：**

1. 按上一个问题的步骤修好依赖，确保 `npm install` 正常完成。
2. 再执行：

   ~~~bash
   npm run start
   ~~~

不需要全局安装 `webpack-dev-server`，本项目已经在 `devDependencies` 里定义了。

---

### 3. 页面提示“无法访问摄像头 / 手势识别模型加载失败”

可能原因：

* 浏览器第一次弹出的摄像头权限被你选择了“拒绝”；
* 设备没有摄像头；
* 一些带有隐私限制的浏览器禁止了 `getUserMedia`。

解决建议：

1. 检查浏览器地址栏左边的“摄像头图标”，重新允许当前站点使用摄像头；
2. 尝试更换浏览器（Chrome / Edge 等）；
3. 确认系统层面没有禁用摄像头、摄像头驱动正常。

---

## 🧩 二次开发建议

如果你想在此基础上做更多玩法，比如：

* 真正做到 **“左右挥手 = 切换粒子 preset”**；
* 为不同手势加上不同的音效、UI 特效；
* 把它嵌入到自己的项目里做一个酷炫的登录页 / loading 动画；

可以从以下几个点入手：

1. **扩展手势逻辑（`useGestureDetector.js`）**

   * 记录最近几帧的关键点位置，分析 X 方向的来回摆动，判断 wave。
   * 为 `gesture` 增加更多状态（如 `wave-left`, `wave-right`）。

2. **为不同手势绑定不同 Particle preset**

   * 在 `ParticleSystem.setEffectParams` 或 `setTarget` 里根据 `gesture` 调整：

     * 粒子颜色；
     * 粒子尺寸；
     * 力场参数（`baseForce`, `swirlStrength`, `burstStrength`）；
   * 例如：

     * `open`：trail + 蓝色；
     * `fist`：burst + 橙黄色；
     * `pinch`：swirl + 紫色。

3. **加入类型提示 / 注释**

   * 如果你习惯 TypeScript，可以把 `*.jsx / *.js` 逐步迁移为 `*.tsx / *.ts`。
   * 也可以简单在关键函数上写 JSdoc 注释，方便 IDE 提示。

---

## 📄 许可证

本项目以 MIT License 开源，你可以自由修改和使用，包括但不限于：

* 用作课程作业 / 毕设展示；
* 内嵌到自己的个人主页 / 作品集；
* 改成自己完全不同风格的交互 Demo。