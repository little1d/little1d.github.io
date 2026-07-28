*关于下一代 Scientific Foundation LLMs 的一些思考*

## 为什么现有 Scientific LLM 范式仍然不够

Scientific LLMs 正沿着三条主要路径演进。

**Scientific chatbots** 将科学知识与推理能力引入语言模型，使其能够完成文献综述、技术问答与假设生成。然而，分子、蛋白质和材料仍主要以序列化字符串或渲染图像的形式进入模型。Language 是表达意图和解释结果的有效接口，但它未必是所有 Scientific Objects 最合适的计算空间或生成空间。

**Agentic workbenches and tool-using systems**，例如 Claude Science，将 LLMs 与数据库、代码环境、科学软件、专用模型和计算资源连接起来。[^1] 这类系统已经具有直接的实用价值，但其科学能力仍分散在外部组件之中：LLM 负责规划和编排，而分子生成、结构预测与模拟仍在其他模块中完成。

**Unified scientific foundation models** 开始将 Scientific Objects 本身纳入模型体系。NatureLM 在一个 autoregressive model 中序列化多个科学领域；LOGOS 使用共享 grammar 表示异构对象及离散化的相互作用；BioMatrix 对分子与蛋白质的 sequence、structure 和 language 进行联合 tokenization；S1-Omni 则将共享 task representations 连接到 domain-specific result decoders。[^2][^3][^4][^5]

这些系统已经显著接近统一科学建模，但仍有若干问题尚未解决：Scientific Objects 与 Relations 应当如何共享一个可组合的 latent space？Language constraints 如何被 grounding 到原生科学表示中？如何在不破坏已有能力的前提下持续加入新的领域和能力？

## 定义下一代 Scientific Foundation LLMs

我将 **Next-Generation Scientific Foundation LLM** 定义为：

> **中文：** 一个以 Language 为锚点、具备原生多模态生成能力的 foundation model。它在 Shared Scientific Latent Space 中表示异构 Scientific Objects 及其 Relations，将通过 Language 指定的 Constraints grounding 到科学表示中，并通过各个模态原生的生成过程产生输出。
>
> **English:** A language-anchored, natively multimodal generative foundation model that represents heterogeneous scientific objects and their relations in a shared scientific latent space, grounds language-specified constraints in scientific representations, and generates through processes native to each modality.

![下一代 Scientific Foundation LLMs 的概念架构。](../../public/blog-assets/scientific-foundation-llms/SFLLMs.png "下一代 Scientific Foundation LLMs 的概念架构。")

这里的 **language-anchored** 是指，Language 充当人类意图与 Scientific Objects 之间的桥梁。传统 task-specific generators 通常只能接收预先定义的狭窄条件，而基于 LLM 的系统允许用户表达开放式设计意图，例如移除 hydrophobic groups、保留 molecular scaffold，或者在给定 antibody framework 与 hotspots 的条件下编辑抗体。通过将这些意图 grounding 为可执行的科学约束，Language 可以使科学生成更加交互、可控，并为解释生成结果提供自然接口。

这里使用 **LLM** 一词，是为了强调以 Language 为中心的交互接口和 reasoning backbone；它并不要求每一种科学模态都通过 autoregressive generation 生成。

### 科学问题以 Scientific Objects 为中心

一个科学问题可以表示为

$$
\mathcal{P} =
(\mathcal{O}, \mathcal{R}, \mathcal{M}, \mathcal{A}; \mathcal{C}),
$$

其中，$\mathcal{O}$ 表示 **Scientific Objects**；$\mathcal{R}$ 表示它们之间的 **Relations**；$\mathcal{M}$ 表示 **Representations / Modalities**；$\mathcal{A}$ 表示作用于它们的 **Operations**；$\mathcal{C}$ 表示有效解必须满足的 **Constraints**。

这些要素并非彼此正交。Scientific Objects 构成问题的本体核心，Relations 连接多个对象，Representations 决定如何观察或计算对象及其关系，Operations 对它们进行变换，而 Constraints 则规定哪些部分可以改变、哪些部分必须保持不变，以及什么样的结果才是可接受的。

以 antibody design 为例：

| Problem element | Antibody design example |
| --- | --- |
| Scientific Objects | Antibody 与 antigen |
| Relations | Binding 与 CDR–epitope contacts |
| Representations / Modalities | Amino-acid sequences 与 complex 3D structures |
| Operations | Conditional CDR generation 与 optimization |
| Constraints | Fixed framework、指定 hotspots、可编辑 CDRs 与 developability requirements |

用户可能提出这样的要求：*保持 framework 不变，重新设计 CDRs，并与这些 antigen hotspots 形成接触*。这类要求不能仅停留在 prompt 中的文字。**Constraint Grounding** 必须将它们编译为 sequence masks、geometry anchors、contact constraints 或 optimization objectives。

随后，**Shared Scientific Latent Space** 需要联合表示意图、对象、关系、约束以及当前生成状态。模型可以进一步调用适当的生成过程：对 Language 与 biological sequences 使用 discrete generation，对 molecular graphs 使用 graph-native generation，对图像使用 diffusion 或 flow matching，对 3D structures 使用 equivariant diffusion 或 flow matching。

因此，统一模型并不要求所有输出共享同一个 tokenizer、decoder 或 generation objective。真正应当共享的是模型对 Scientific Objects、Relations、Constraints 与 task states 的理解，而具体生成过程则应保留各个输出空间的结构与 inductive biases。

从这个意义上说，Next-Generation Scientific Foundation LLMs 应当是 **language-anchored、object-centered、constraint-grounded 和 modality-native** 的。

## 一个由四部分组成的 Research Agenda

### 1. Native Scientific Generation

许多 unified scientific models 通过将异构对象转化为 discrete sequences，并把所有任务归约为 next-token prediction 来获得可扩展性。另一种选择并不是强行把 autoregressive generation、diffusion 与 flow matching 统一成同一种算法，而是让共享 backbone 为不同的 modality-native generators 提供共同的科学条件。

Transfusion 提供了一个早期范例：同一个 Transformer 可以同时支持 autoregressive text generation 与 diffusion-based image generation，并保留不同的训练目标。[^6] 将这一思路扩展到科学模型，需要原生支持 sequences、graphs、images 与 continuous 3D geometry，并为不同模态配置适当的 equivariance。[^7][^8]

> 如何让共享 backbone 在 sequences、graphs、images 与 continuous 3D geometry 上，为 modality-native autoregressive、diffusion 和 flow-based generators 提供条件，同时不抹去各自不同的 inductive biases？

### 2. Scalable Scientific Specialization

Scientific Foundation LLM 不可能一次训练完成后便保持不变。它必须持续吸收新的领域、模态与能力，同时保留原有的 Language interface、general reasoning 和已经学习到的科学知识。

Continued pretraining 提供了一条路径，而 Mixture of Experts、Mixture of Transformers 与 routed LoRA specialists 等 modular architectures，则能对 capacity allocation 提供更明确的控制。[^9][^10][^11]

> 如何持续且规模化地加入新的科学能力，同时避免 catastrophic forgetting 与 cross-domain interference？

### 3. Scientific Latent Reasoning

长期目标不应仅仅是描述 Scientific Objects，而应当解决开放式设计问题，例如开发新药。这类任务要求模型对 structures、interactions、constraints 与 uncertainty 进行高层次推理。

LLM reasoning 的演进可以被概括为三个阶段：面向 text-centric tasks 的显式 Chain-of-Thought；**thinking with images**，即 multimodal models 检查渲染后的 Scientific Objects 并调用外部工具；以及 **latent thinking**，即直接在学习到的科学表示上进行推理。

第二个阶段已经具有实际价值。例如，模型可以在 PyMOL 中检查 binding pose、识别可见的结构问题，并据此修订候选方案。但它不太可能成为 scientific intelligence 的最终形态。许多科学状态无法被 human-readable renderings 完整表达：molecular graph 或渲染后的 3D complex 只是更丰富状态的部分投影。同时，Evaluation 本身也较弱，computational oracles 只是近似，wet-lab feedback 则昂贵且低通量。因此，外部工具应继续作为 feedback loop 的组成部分，但不应成为 reasoning 唯一的 substrate 或 oracle。

**Scientific Latent Reasoning** 要求模型直接在 Scientific Objects、Relations、geometry、constraints 与 uncertainty 的 latent representations 上进行推理。Language 仍是人类表达意图并理解结果的接口。以此类推，The Bitter Lesson 提示我们：主要为人类检查而设计的 representations 与 heuristics，不一定应当定义 machine reasoning 的能力上限；scalable learning 与 search 可能发现恰恰因为不符合人类直觉而依然有效的策略。[^12]

> 在 computational oracles 不完美、experimental feedback 稀疏的条件下，模型如何直接在 latent space 中学习高层次科学推理，同时仍可通过 Language 控制？

### 4. Scalable Multimodal Infrastructure

底层基础设施必须联合支持 variable-length sequences、graphs、images 与 3D coordinates；协调 autoregressive、diffusion 和 flow-matching objectives；管理 shared modules 与 modality-specific modules 之间的 gradients；并在 distributed hardware 上扩展 sparse routing。

系统还必须具备可扩展性。加入一个新的科学领域或模态，应当更接近于注册新的 data stream、objective 和 generator，而不是重新构建一条独立训练管线。

> 什么样的训练基础设施能够联合调度异构数据、generation objectives 与 model modules，同时保持高效、可扩展和易于扩展？

以上四个方向描述了这类系统可以如何被构建。更深层的问题是：最终应当由什么样的目标来引导它？

## From Oracles to Intent

从 Sutton-style reinforcement learning 的视角看，Scientific Foundation LLM 可以被视为一个 agent：它观察 scientific state、执行 actions、接收 feedback，并迭代地追求目标。[^13] 但这一目标不能被简化为单一 oracle score。Biomolecular design spaces 是开放且组合爆炸的，而每个 oracle 都只拟合了已经被观察到的、稀疏且存在偏差的数据子集。一个通过验证的分子或许可以完成某一次项目，但它本身无法定义 foundation agent 的一般目标。

在 general scientific agent 的层面，更深层的 goal specification 是 **scientifically grounded human intent**。Intent 规定了什么应被创建、保留、移除或权衡，包括 affinity、selectivity、scaffold preservation、hydrophobic-group removal 与 hotspot engagement。Oracles、simulations 和 experiments 并不是目标本身，而是检验和修正 intent 的部分 feedback。

医学史也体现了这一差异。Tu Youyou 根据古代制备方法重新解释不一致的 screening results，重新设计 extraction process，并分离出 artemisinin。[^14] Fleming 的培养皿污染是偶然事件，但他识别出其中的 antibacterial significance，Florey 与 Chain 随后将这一线索转化为治疗手段，最终使 penicillin 成为药物。[^15][^16] Observation 揭示了可能性，而 human judgment 与 intent 决定了哪些可能性值得被继续探索。

这一视角也揭示了现有范式的局限：Specialized models 可以直接作用于 Scientific Objects，但只接受狭窄目标；scientific chatbots 可以表达 intent，却很少原生地作用于这些对象；agentic workbenches 将 intent 与 action 连接起来，但主要依赖外部工具。

下一代 Scientific Foundation LLM 应当闭合这一循环：Language 表达 intent，Constraint Grounding 将其转化为可执行约束，Shared Scientific Latent Space 维护不断演化的状态，modality-native generators 则直接作用于 Scientific Objects。随后，tools 与 experiments 为下一步决策提供 feedback。

这正是我对 LLMs for science 保持乐观的原因：它们最深层的价值，或许是提供一个可扩展接口，使 human intent 能够直接引导 Scientific Objects 的迭代生成与优化。

[^1]: Anthropic. *Claude Science, an AI Workbench for Scientists, Is Now Available*. 2026. [Official announcement](https://www.anthropic.com/news/claude-science-ai-workbench)

[^2]: NatureLM Team. *Nature Language Model: Deciphering the Language of Nature for Scientific Discovery*. arXiv:2502.07527, 2025. [Paper](https://arxiv.org/abs/2502.07527) · [Project](https://naturelm.github.io/)

[^3]: Mingyang Li et al. *Speaking the Language of Science: Toward a General-Purpose Generative Foundation Model for the Natural Sciences*. arXiv:2606.16905, 2026. [Paper](https://arxiv.org/abs/2606.16905)

[^4]: Qizhi Pei et al. *BioMatrix: Towards a Comprehensive Biological Foundation Model Spanning the Modality Matrix of Sequences, Structures, and Language*. arXiv:2606.22138, 2026. [Paper](https://arxiv.org/abs/2606.22138) · [Code](https://github.com/QizhiPei/BioMatrix)

[^5]: Jiahao Zhao et al. *S1-Omni: A Unified Multimodal Reasoning Model for Scientific Understanding, Prediction, and Generation*. arXiv:2607.15686, 2026. [Paper](https://arxiv.org/abs/2607.15686) · [Project](https://scienceone-ai.github.io/S1-Omni/)

[^6]: Chunting Zhou et al. *Transfusion: Predict the Next Token and Diffuse Images with One Multi-Modal Model*. arXiv:2408.11039, 2024. [Paper](https://arxiv.org/abs/2408.11039)

[^7]: Yaron Lipman et al. *Flow Matching for Generative Modeling*. ICLR, 2023. [Paper](https://openreview.net/forum?id=PqvMRDCJT9t)

[^8]: Emiel Hoogeboom et al. *Equivariant Diffusion for Molecule Generation in 3D*. ICML, 2022. [Paper](https://proceedings.mlr.press/v162/hoogeboom22a.html)

[^9]: William Fedus et al. *Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity*. JMLR, 2022. [Paper](https://www.jmlr.org/papers/v23/21-0998.html)

[^10]: Weixin Liang et al. *Mixture-of-Transformers: A Sparse and Scalable Architecture for Multi-Modal Foundation Models*. 2024. [Paper](https://arxiv.org/abs/2411.04996)

[^11]: Xun Wu et al. *Mixture of LoRA Experts*. 2024. [Paper](https://arxiv.org/abs/2404.13628)

[^12]: Rich Sutton. *The Bitter Lesson*. 2019. [Essay](https://www.incompleteideas.net/IncIdeas/BitterLesson.html)

[^13]: Richard S. Sutton and Andrew G. Barto. *Reinforcement Learning: An Introduction*. 2nd edition, MIT Press, 2018. [Book](https://reinforcementlearning.pubpub.org/)

[^14]: Tu Youyou. *Biographical*. NobelPrize.org, 2015. [Article](https://www.nobelprize.org/prizes/medicine/2015/tu/biographical/)

[^15]: Alexander Fleming. *Nobel Banquet Speech*. NobelPrize.org, 1945. [Speech](https://www.nobelprize.org/prizes/medicine/1945/fleming/speech/)

[^16]: NobelPrize.org. *Sir Howard Florey—Facts*. [Article](https://www.nobelprize.org/prizes/medicine/1945/florey/facts/)
