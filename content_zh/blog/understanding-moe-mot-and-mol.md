MoE、MoT 与 MoL 都引入了参数特化（parameter specialization），但它们作用于不同层级。

## Mixture of Experts

一个 Mixture of Experts（MoE）层包含 $N$ 个 expert networks，

$$
E_1, \ldots, E_N,
$$

以及一个 gating network，通常称为 **router**。给定输入表示 $x \in \mathbb{R}^{d}$，router 会为每个 expert 分配一个分数，再根据 routing weights 组合各个 expert 的输出。[^1]

![嵌入 recurrent language model 的 sparsely gated MoE 层。](../../public/blog-assets/understanding-moe-mot-and-mol/moe.jpeg "嵌入 recurrent language model 的 sparsely gated MoE 层。Router 选择两个 experts，并使用学习得到的 gate values 组合它们的输出。来源：Shazeer et al. (2017)，Figure 1。")

对于接 softmax 的 linear router，其分数和 dense routing weights 为

$$
s(x) = W_g x,
\qquad
g_i(x) =
\frac{\exp\!\left(s_i(x)\right)}
{\sum_{j=1}^{N} \exp\!\left(s_j(x)\right)}.
$$

因此，dense MoE 的输出为

$$
y_{\text{dense}}(x)
=
\sum_{i=1}^{N} g_i(x) E_i(x).
$$

在 sparse MoE 中，只有 router 分数位于 top-$k$ 的 experts 会被激活。令

$$
\mathcal{T}_k(x) = \operatorname{TopK}\!\left(s(x), k\right).
$$

归一化后的 sparse routing weights 可以写为

$$
\tilde{g}_i(x) =
\begin{cases}
\displaystyle
\frac{\exp\!\left(s_i(x)\right)}
{\sum_{j \in \mathcal{T}_k(x)} \exp\!\left(s_j(x)\right)},
& i \in \mathcal{T}_k(x), \\
0,
& \text{otherwise},
\end{cases}
$$

由此得到

$$
y_{\text{sparse}}(x)
=
\sum_{i \in \mathcal{T}_k(x)} \tilde{g}_i(x) E_i(x).
$$

下图展示了 dense routing 与 sparse routing 的区别。[^2]

![Transformer MoE 层中的 dense routing 与 sparse routing。](../../public/blog-assets/understanding-moe-mot-and-mol/dense-vs-sparse-moe.png "Dense MoE 激活所有 experts，而 Sparse MoE 只为每个输入选择 top-k experts。来源：Cai et al. (2024)，Figure 2。")

它的关键优势是 conditional computation：模型可以通过增加 experts 扩大参数容量，同时让每个 token 的实际计算量近似与 $k$ 成正比，而不是与 experts 总数 $N$ 成正比。

## Mixture of Transformers

Dense multimodal Transformer 使用相同的 attention projections、feed-forward networks 与 normalization layers 处理 text、image 和 speech tokens。这种方式最大化了参数共享，却也迫使统计结构和训练动态不同的模态竞争同一份模型容量。

然而，由此得到的 hidden states 并非真正的 modality-agnostic。对 Chameleon+Speech 7B 的 PCA 分析显示，即使 dense Transformer 对所有模态应用相同参数，text、image 与 speech representations 仍会在多个层中形成明显分离的 clusters。[^mot] 这种经验上的分离现象说明，我们需要在保留 cross-modal interaction 的同时，让参数路径尊重 modality-specific structure。

![Dense multimodal Transformer 的 feature-space 分析。](../../public/blog-assets/understanding-moe-mot-and-mol/feature-space-analysis.jpeg "Chameleon+Speech 7B 在第 1、5、17 与 32 层 hidden states 的 PCA。即使 Dense Transformer 对所有 tokens 使用共享参数，text、image 与 speech features 仍形成不同的 modality-specific clusters。来源：Liang et al. (2025)，Figure 2。")

Mixture-of-Transformers（MoT）放宽了这一共享假设：它为每种模态分配独立的 Transformer parameters，同时在完整 multimodal sequence 上保留 global attention。[^mot] 其核心原则是：

> Cross-modal interaction 可以共享，但不必强迫所有模态共享相同的计算过程。

![面向 autoregressive 与 diffusion objectives 的 Mixture-of-Transformers 架构。](../../public/blog-assets/understanding-moe-mot-and-mol/mot.png "Mixture-of-Transformers 使用 modality-specific Transformer parameters，同时通过 shared feature space 保留 cross-modal interaction。来源：Liang et al. (2025)。")

给定一个交错序列

$$
X=(x_1,\ldots,x_n),
\qquad
m_i \in \mathcal{M},
$$

其中 $m_i$ 表示 token $x_i$ 的已知模态。MoT 首先按模态对 tokens 分组，并应用 modality-specific attention projections：

$$
Q_i = x_i W_Q^{m_i},
\qquad
K_i = x_i W_K^{m_i},
\qquad
V_i = x_i W_V^{m_i}.
$$

随后，这些 projected representations 会恢复到原始序列顺序，并由 global self-attention 共同处理：

$$
A =
\operatorname{softmax}
\left(
\frac{QK^\top}{\sqrt{d_k}}
\right)V.
$$

因此，即使 text query 与 image 或 speech 的 keys 和 values 来自不同 projection matrices，它仍然可以对它们进行 attention。完成 attention 后，每个 token 再通过 modality-specific output projections、LayerNorms 与 FFNs 处理：

$$
h_i =
x_i +
\operatorname{LN}_{\mathrm{attn}}^{m_i}
\left(A_iW_O^{m_i}\right),
$$

$$
y_i =
h_i +
\operatorname{LN}_{\mathrm{ffn}}^{m_i}
\left(
\operatorname{FFN}^{m_i}(h_i)
\right).
$$

因此，MoT 并不是一组彼此隔离的 modality towers，而是由 modality-specific parameter paths 组成，并在每一层通过 joint attention 交换信息。模型共享的是 sequence context、hidden feature space 与 attention interaction，而不是主要的 Transformer weights。

### Deterministic Modality Routing

与 MoE 不同，MoT 不学习 router，也不选择 top-$k$ experts。Routing decision 直接由已知的 modality label 决定：

$$
\operatorname{route}(x_i) = m_i.
$$

每个 token 只激活一条 modality-specific parameter path。因此，增加模态会提高总参数量，但不会增加每个 token 实际执行的参数路径数量。忽略 indexing overhead 时，

$$
\operatorname{FLOPs}_{\mathrm{MoT/token}}
\approx
\operatorname{FLOPs}_{\mathrm{Dense/token}}.
$$

因此，论文报告的效率提升应理解为更快的 convergence，而不是单次 forward pass 更便宜。例如，7B MoT 只使用 dense Chameleon baseline 累计训练 FLOPs 的 55.8%，便达到了与其相当的性能。[^mot]

### Supporting Heterogeneous Generative Objectives

MoT 可以兼容不同的 representations 与 generation objectives。在 Chameleon setting 中，text 与 images 都表示为 discrete tokens，并通过 autoregressive generation 生成。[^chameleon] 在 Transfusion setting 中，text 通过 next-token prediction 生成，而 continuous image latents 则通过 diffusion 生成。[^transfusion]

联合目标可以写为

$$
\mathcal{L} =
\mathcal L_{\mathrm{AR}}^{\mathrm{text}}
+
\lambda
\mathcal L_{\mathrm{diff}}^{\mathrm{image}}.
$$

这些组件作用于三个不同层级：

$$
\text{MoT backbone}
\rightarrow
\text{modality-specific latent generation}
\rightarrow
\text{modality-specific reconstruction}.
$$

MoT 决定由哪些 Transformer parameters 处理各个模态；generative objective 决定如何产生其 latent representation；VAE、VQ-VAE 或其他 modality-specific decoder 则负责重建最终对象。因此，backbone 建模高层内容与 cross-modal relationships，而 decoder 处理低层的 modality reconstruction。

## Mixture of LoRA

Mixture of LoRA（MoL），也称 Multi-LoRA，在 adapter 层面对共享 backbone 进行特化。本文使用广义的 MoL，指在同一个 frozen backbone 上维护多个 LoRA specializations 的系统：它们既可以为每个任务选择一个 adapter，也可以动态组合多个 adapters。

与 MoE 和 MoT 不同，MoL 不一定会在每次 forward pass 内引入 learned mixture。它将 base model 视为共享基础设施，并把每一种 specialization 保存为紧凑的 parameter delta。

对于 pretrained weight matrix $W_0$，LoRA 将适配后的权重表示为

$$
W_j
=
W_0 + \Delta W_j
=
W_0 + \frac{\alpha}{r} B_j A_j,
$$

其中，$A_j$ 与 $B_j$ 是 adapter $j$ 对应的 low-rank trainable matrices。在 adaptation 过程中，$W_0$ 保持冻结，仅更新 $A_j$ 与 $B_j$。[^lora]

因此，一个 base model 可以支持一组 specialized adapters：

$$
\Phi = \{\phi_1, \phi_2, \ldots, \phi_M\}.
$$

给定 task、domain 或 policy identifier $c$，系统选择一个 adapter：

$$
j = s(c),
\qquad
y = f\!\left(x; W_0 + \Delta W_j\right).
$$

这样便可以在不复制或修改 base checkpoint 的情况下构造多个 specialized models。增加一种新的 specialization，只需要训练并存储一个新的 low-rank adapter。

### MinT: Managing LoRA as a Policy Unit

MinT 是这一抽象在 systems 层面的一个例子。[^mint] 它让 base model 保持冻结并常驻内存，而由 post-training methods 更新、评估和部署各个 LoRA adapters。因此，specialization 与 versioning 的基本单元是 adapter，而不是重新物化得到的完整模型 checkpoint。

## 三种 Parameter Specialization 的比较

| Method | Selection granularity | Specialized parameters | Primary role |
| --- | --- | --- | --- |
| MoE | Token-level、learned | Expert modules，通常为 FFNs | Conditional model capacity |
| MoT | Modality-level、deterministic | Attention、FFN 与 normalization paths | Modality-specific computation |
| Multi-LoRA | Task-、domain- 或 policy-level | Low-rank parameter deltas | Modular post-training 与 deployment |

MoE 与 MoT 主要改变模型内部的计算过程。Multi-LoRA 则提供了一种轻量机制，用于在同一个 frozen backbone 上创建和管理多个 specialized variants。

[^1]: Noam Shazeer et al. *Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer*. ICLR, 2017. [Paper](https://arxiv.org/abs/1701.06538)

[^2]: Weilin Cai et al. *A Survey on Mixture of Experts*. arXiv:2407.06204, 2024. [Paper](https://arxiv.org/abs/2407.06204)

[^mot]: Weixin Liang et al. *Mixture-of-Transformers: A Sparse and Scalable Architecture for Multi-Modal Foundation Models*. TMLR, 2025. [Paper](https://arxiv.org/abs/2411.04996) · [Code](https://github.com/facebookresearch/Mixture-of-Transformers)

[^chameleon]: Chameleon Team. *Chameleon: Mixed-Modal Early-Fusion Foundation Models*. 2024. [Paper](https://arxiv.org/abs/2405.09818)

[^transfusion]: Chunting Zhou et al. *Transfusion: Predict the Next Token and Diffuse Images with One Multi-Modal Model*. 2024. [Paper](https://arxiv.org/abs/2408.11039)

[^lora]: Edward J. Hu et al. *LoRA: Low-Rank Adaptation of Large Language Models*. ICLR, 2022. [Paper](https://arxiv.org/abs/2106.09685)

[^mint]: Mind Lab et al. *MinT: Managed Infrastructure for Training and Serving Millions of LLMs*. 2026. [Paper](https://arxiv.org/abs/2605.13779) · [Code](https://github.com/MindLab-Research/mindlab-toolkit)
