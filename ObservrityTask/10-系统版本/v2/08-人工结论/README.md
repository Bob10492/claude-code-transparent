# V2 人工结论

这个目录是 `V2.5` 收敛后的主输出入口。

## 这个目录放什么

这里放的是：

- 你对某次实验的人工判断
- 你自己决定是否接受某个 candidate
- 你自己决定下一步做什么

这里不放：

- 自动跑出来的 `run / compare / batch report`
- 自动反馈系统生成的 `proposal queue`

那些内容分别还在：

- [../06-运行报告](../06-%E8%BF%90%E8%A1%8C%E6%8A%A5%E5%91%8A/)
- [../07-反馈报告](../07-%E5%8F%8D%E9%A6%88%E6%8A%A5%E5%91%8A/)

## 推荐阅读顺序

1. 先看 `experiment-run JSON`
2. 再看 `06-运行报告` 里的 `batch / compare / experiment` 报告
3. 然后看这里的人工结论
4. 最后才把 `07-反馈报告` 当附录看

## 当前文件

- [00-人工结论索引.md](./00-%E4%BA%BA%E5%B7%A5%E7%BB%93%E8%AE%BA%E7%B4%A2%E5%BC%95.md)
- [_manual_conclusion.template.md](./_manual_conclusion.template.md)

## 使用方式

如果你想从某个 experiment-run 自动生成一份人工结论草稿，使用：

```powershell
bun run scripts/evals/v2_create_manual_conclusion.ts --experiment-run <experiment-run-json>
```

这个命令只会帮你整理事实，不会替你下结论。
