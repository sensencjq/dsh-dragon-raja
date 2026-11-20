# dsh-dragon-raja

《龙族》执行员登录主题（Dragon Raja executive-login skin）for DeepSeek Harness。

- 打开时的权限确认动画 → “欢迎您，xx 专员”
- 黑金执行部配色（跟随系统浅色/深色，可在“执行员档案”里开关）
- 全屏 HUD 描边/扫描线装饰
- 侧栏龙纹徽记与品牌名
- 设置 → 执行员档案：改代号、开关配色/HUD/开场动画、重播动画

## 安装

本目录即插件包根目录：

1. 克隆仓库：`git clone https://github.com/sensencjq/dsh-dragon-raja.git`
2. 打开 DSH 的 **插件管理 → 添加插件**，选择该目录。
3. 启用后打开（或刷新）页面，权限确认序列自动播放一次。

`client.js` 是无需构建的 Client 模块，`cordis.patch.yml` 负责把 Host 行插进配置树——装好即用，没有构建步骤。

## 使用

- 想改代号：设置 → **执行员档案** → 修改“专员代号” → 保存档案，再点“重播权限确认”即可看到新欢迎语。
- 不想每次看开场：在同一页点“关闭开场动画”。
- 代号默认是占位名「无名」，改过之后存在本机浏览器里。

详见 [`docs/DETAIL.md`](docs/DETAIL.md)。

## 许可

- 代码：MIT（见 [LICENSE](LICENSE)）。
- 《龙族》、卡塞尔学院及相关设定版权归江南所有；本主题是非商业同人作品，与官方无关。
- 主题内的图形（龙纹徽记、图标）为自绘 SVG，随 MIT 授权。
