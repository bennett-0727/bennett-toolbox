import { beforeEach, describe, test } from "@e2e-dev/web";
import { expect } from "e2e";

describe("Bennett Toolbox 冒烟测试", () => {
  beforeEach(async ({ app }) => {
    await app.open("/");
  });

  test("侧边栏渲染 11 个工具模块", async ({ screen }) => {
    await expect(screen.getByRole("listitem")).toHaveCount(11);
    await expect(screen.getByRole("heading", "JSON 格式化")).toBeVisible();

    const modules = [
      "JSON 格式化",
      "变量命名",
      "图片转换",
      "图片压缩",
      "图片去水印",
      "PDF 转图片",
      "视频转 GIF",
      "文件搜索",
      "文档转 MD",
      "截图悬浮",
      "屏幕取色",
    ];
    for (const name of modules) {
      await expect(screen.getByRole("button", { name: new RegExp(name) })).toBeVisible();
    }
  });

  test("JSON 格式化与语法错误提示", async ({ screen }) => {
    const input = screen.getByPlaceholder(/在此粘贴 JSON 字符串/);

    await input.fill('{"name":"张三","age":25,"tags":["a","b"]}');
    await screen.getByRole("button", { name: /^✨ 格式化$/ }).tap();
    await expect(screen.getByText('"name"', { exact: true })).toBeVisible();
    await expect(screen.getByText('"age"', { exact: true })).toBeVisible();
    await expect(screen.getByText('"tags"', { exact: true })).toBeVisible();
    await expect(screen.getByText('"a"', { exact: true })).toBeVisible();

    await input.fill("{ invalid json }");
    await expect(screen.getByText(/JSON 语法错误/)).toBeVisible();
  });

  test("可以切换工具模块", async ({ screen }) => {
    await screen.getByRole("button", { name: /变量命名/ }).tap();
    await expect(screen.getByRole("heading", /变量命名/)).toBeVisible();

    await screen.getByRole("button", { name: /图片压缩/ }).tap();
    await expect(screen.getByRole("heading", "图片批量压缩")).toBeVisible();

    await screen.getByRole("button", { name: /屏幕取色/ }).tap();
    await expect(screen.getByRole("heading", /屏幕取色器/)).toBeVisible();

    await screen.getByRole("button", { name: /JSON 格式化/ }).tap();
    await expect(screen.getByRole("heading", "JSON 格式化")).toBeVisible();
  });
});
