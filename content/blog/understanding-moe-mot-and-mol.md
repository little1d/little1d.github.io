MoE, MoT, and MoL all introduce parameter specialization, but at different levels.

## Mixture of Experts

A Mixture of Experts (MoE) layer contains $N$ expert networks,

$$
E_1, \ldots, E_N,
$$

and a gating network, usually called a **router**. Given an input representation $x \in \mathbb{R}^{d}$, the router assigns one score to each expert. The expert outputs are then combined according to the routing weights.[^1]

![A sparsely gated MoE layer embedded in a recurrent language model.](../../public/blog-assets/understanding-moe-mot-and-mol/moe.jpeg "A sparsely gated MoE layer embedded in a recurrent language model. The router selects two experts and combines their outputs using the learned gate values. Source: Shazeer et al. (2017), Figure 1.")

For a linear router followed by a softmax, the scores and dense routing weights are

$$
s(x) = W_g x,
\qquad
g_i(x) =
\frac{\exp\!\left(s_i(x)\right)}
{\sum_{j=1}^{N} \exp\!\left(s_j(x)\right)}.
$$

The dense MoE output is therefore

$$
y_{\text{dense}}(x)
=
\sum_{i=1}^{N} g_i(x) E_i(x).
$$

In a sparse MoE, only the experts with the top-$k$ router scores are activated. Let

$$
\mathcal{T}_k(x) = \operatorname{TopK}\!\left(s(x), k\right).
$$

The normalized sparse routing weights can be written as

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

which gives

$$
y_{\text{sparse}}(x)
=
\sum_{i \in \mathcal{T}_k(x)} \tilde{g}_i(x) E_i(x).
$$

The distinction between dense and sparse routing is illustrated below.[^2]

![Dense and sparse routing in a Transformer MoE layer.](../../public/blog-assets/understanding-moe-mot-and-mol/dense-vs-sparse-moe.png "Dense MoE activates all experts, whereas Sparse MoE selects only the top-k experts for each input. Source: Cai et al. (2024), Figure 2.")

The key advantage is conditional computation: the model can increase its parameter capacity by adding experts while keeping the active computation per token approximately proportional to $k$, rather than to the total number of experts $N$.

## Mixture of Transformers

A dense multimodal Transformer processes text, image, and speech tokens with the same attention projections, feed-forward networks, and normalization layers. While this maximizes parameter sharing, it also forces modalities with different statistical structures and training dynamics to compete for the same capacity.

The resulting hidden states are not actually modality-agnostic. A PCA analysis of Chameleon+Speech 7B shows that text, image, and speech representations form visibly distinct clusters across multiple layers, even though the dense Transformer applies the same parameters to every modality.[^mot] This empirical separation motivates parameter paths that respect modality-specific structure while retaining cross-modal interaction.

![Feature-space analysis of a dense multimodal Transformer.](../../public/blog-assets/understanding-moe-mot-and-mol/feature-space-analysis.jpeg "PCA of Chameleon+Speech 7B hidden states at layers 1, 5, 17, and 32. Text, image, and speech features form distinct modality-specific clusters even though the dense Transformer applies shared parameters to all tokens. Source: Liang et al. (2025), Figure 2.")

Mixture-of-Transformers (MoT) relaxes this assumption by assigning each modality its own Transformer parameters while preserving global attention across the full multimodal sequence.[^mot] Its central principle is:

> Cross-modal interaction can be shared without forcing all modalities to share the same computation.

![The Mixture-of-Transformers architecture for autoregressive and diffusion objectives.](../../public/blog-assets/understanding-moe-mot-and-mol/mot.png "Mixture-of-Transformers applies modality-specific Transformer parameters while preserving cross-modal interaction in a shared feature space. Source: Liang et al. (2025).")

Given an interleaved sequence

$$
X=(x_1,\ldots,x_n),
\qquad
m_i \in \mathcal{M},
$$

where $m_i$ denotes the known modality of token $x_i$, MoT first groups tokens by modality and applies modality-specific attention projections:

$$
Q_i = x_i W_Q^{m_i},
\qquad
K_i = x_i W_K^{m_i},
\qquad
V_i = x_i W_V^{m_i}.
$$

The projected representations are then restored to their original sequence order and jointly processed by global self-attention:

$$
A =
\operatorname{softmax}
\left(
\frac{QK^\top}{\sqrt{d_k}}
\right)V.
$$

Thus, a text query can still attend to image or speech keys and values, even though they were produced by different projection matrices. After attention, each token is again processed using modality-specific output projections, LayerNorms, and FFNs:

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

MoT is therefore not a collection of isolated modality towers. It consists of modality-specific parameter paths that exchange information through joint attention at every layer. What is shared is the sequence context, hidden feature space, and attention interaction—not the main Transformer weights.

### Deterministic Modality Routing

Unlike MoE, MoT does not learn a router or select top-$k$ experts. The routing decision follows directly from the known modality label:

$$
\operatorname{route}(x_i) = m_i.
$$

Each token activates exactly one modality-specific parameter path. Adding modalities therefore increases the total parameter count, but not the number of parameter paths executed per token. Ignoring indexing overhead,

$$
\operatorname{FLOPs}_{\mathrm{MoT/token}}
\approx
\operatorname{FLOPs}_{\mathrm{Dense/token}}.
$$

The reported efficiency gains should therefore be understood as faster convergence rather than cheaper individual forward passes. For example, the 7B MoT model reaches the dense Chameleon baseline using 55.8% of its cumulative training FLOPs.[^mot]

### Supporting Heterogeneous Generative Objectives

MoT is compatible with different representations and generation objectives. In the Chameleon setting, text and images are both represented as discrete tokens and generated autoregressively.[^chameleon] In the Transfusion setting, text is generated through next-token prediction, while continuous image latents are generated through diffusion.[^transfusion]

The joint objective can be written as

$$
\mathcal{L} =
\mathcal L_{\mathrm{AR}}^{\mathrm{text}}
+
\lambda
\mathcal L_{\mathrm{diff}}^{\mathrm{image}}.
$$

These components operate at three distinct levels:

$$
\text{MoT backbone}
\rightarrow
\text{modality-specific latent generation}
\rightarrow
\text{modality-specific reconstruction}.
$$

MoT determines which Transformer parameters process each modality. The generative objective determines how its latent representation is produced, while a VAE, VQ-VAE, or another modality-specific decoder reconstructs the final object. The backbone therefore models high-level content and cross-modal relationships, whereas the decoder handles low-level modality reconstruction.

## Mixture of LoRA

Mixture of LoRA (MoL), or Multi-LoRA, specializes a shared backbone at the adapter level. In this article, MoL refers broadly to systems that maintain multiple LoRA specializations over one frozen backbone, whether they select a single adapter for each task or compose several adapters dynamically.

Unlike MoE and MoT, MoL does not necessarily introduce a learned mixture inside each forward pass. Instead, it treats the base model as shared infrastructure and stores each specialization as a compact parameter delta.

For a pretrained weight matrix $W_0$, LoRA represents the adapted weight as

$$
W_j
=
W_0 + \Delta W_j
=
W_0 + \frac{\alpha}{r} B_j A_j,
$$

where $A_j$ and $B_j$ are low-rank trainable matrices associated with adapter $j$. During adaptation, $W_0$ remains frozen and only $A_j$ and $B_j$ are updated.[^lora]

A single base model can therefore support a population of specialized adapters:

$$
\Phi = \{\phi_1, \phi_2, \ldots, \phi_M\}.
$$

Given a task, domain, or policy identifier $c$, the system selects an adapter:

$$
j = s(c),
\qquad
y = f\!\left(x; W_0 + \Delta W_j\right).
$$

This produces multiple specialized models without duplicating or modifying the base checkpoint. Adding a new specialization only requires training and storing another low-rank adapter.

### MinT: Managing LoRA as a Policy Unit

MinT provides one systems-level example of this abstraction.[^mint] It keeps the base model frozen and resident while post-training methods update, evaluate, and serve individual LoRA adapters. The adapter therefore becomes the unit of specialization and versioning, rather than a newly materialized full-model checkpoint.

## Comparing Three Forms of Specialization

| Method     | Selection granularity           | Specialized parameters                  | Primary role                         |
| ---------- | ------------------------------- | --------------------------------------- | ------------------------------------ |
| MoE        | Token-level, learned            | Expert modules, usually FFNs            | Conditional model capacity           |
| MoT        | Modality-level, deterministic   | Attention, FFN, and normalization paths | Modality-specific computation        |
| Multi-LoRA | Task-, domain-, or policy-level | Low-rank parameter deltas               | Modular post-training and deployment |

MoE and MoT primarily modify the internal computation of the model. Multi-LoRA instead provides a lightweight mechanism for creating and managing many specialized variants of the same frozen backbone.

[^1]: Noam Shazeer et al. *Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer*. ICLR, 2017. [Paper](https://arxiv.org/abs/1701.06538)

[^2]: Weilin Cai et al. *A Survey on Mixture of Experts*. arXiv:2407.06204, 2024. [Paper](https://arxiv.org/abs/2407.06204)

[^mot]: Weixin Liang et al. *Mixture-of-Transformers: A Sparse and Scalable Architecture for Multi-Modal Foundation Models*. TMLR, 2025. [Paper](https://arxiv.org/abs/2411.04996) · [Code](https://github.com/facebookresearch/Mixture-of-Transformers)

[^chameleon]: Chameleon Team. *Chameleon: Mixed-Modal Early-Fusion Foundation Models*. 2024. [Paper](https://arxiv.org/abs/2405.09818)

[^transfusion]: Chunting Zhou et al. *Transfusion: Predict the Next Token and Diffuse Images with One Multi-Modal Model*. 2024. [Paper](https://arxiv.org/abs/2408.11039)

[^lora]: Edward J. Hu et al. *LoRA: Low-Rank Adaptation of Large Language Models*. ICLR, 2022. [Paper](https://arxiv.org/abs/2106.09685)

[^mint]: Mind Lab et al. *MinT: Managed Infrastructure for Training and Serving Millions of LLMs*. 2026. [Paper](https://arxiv.org/abs/2605.13779) · [Code](https://github.com/MindLab-Research/mindlab-toolkit)
