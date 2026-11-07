import { beforeEach, describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

describe("Bennett Toolbox 壳层冒烟测试", () => {
  beforeEach(async ({ app }) => {
    await app.open("/");
  });

  test("默认进入工作台并展示插件与设置", async ({ screen }) => {
    await expect(screen.getByRole("listitem")).toHaveCount(0);
    await expect(screen.getByRole("heading", "工作台")).toBeVisible();
    await expect(screen.getByText("已安装")).toBeVisible();
    await expect(screen.getByText("可安装")).toBeVisible();
    await expect(screen.getByText("组件")).toBeVisible();
    await expect(screen.getByRole("button", { name: /刷新插件列表/ })).toBeVisible();
    await expect(screen.getByRole("heading", "设置")).toBeVisible();
  });

  test("工作台内切换语言与主题", async ({ screen }) => {
    await screen.getByRole("button", { name: "English" }).tap();
    await expect(screen.getByRole("heading", "Workbench")).toBeVisible();
    await expect(screen.getByRole("heading", "Settings")).toBeVisible();

    await screen.getByRole("button", { name: "中文" }).tap();
    await expect(screen.getByRole("heading", "工作台")).toBeVisible();
    await expect(screen.getByRole("heading", "设置")).toBeVisible();
    await screen.getByRole("button", { name: "浅色玻璃" }).tap();
    await expect(screen.getByRole("button", { name: "浅色玻璃" })).toBeVisible();
  });

  test("工作台显示 MarkItDown 组件", async ({ screen }) => {
    await expect(screen.getByText("文档转换组件")).toBeVisible();
    await expect(screen.getByRole("button", { name: /下载组件/ })).toBeVisible();
  });
});
