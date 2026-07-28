Antibody design is often described as a generation problem, but the harder question is how a model should learn from its own generation process. For flexible complementarity-determining regions such as CDR-H3, small structural errors can accumulate across a denoising trajectory. Training only on synthetically perturbed native structures does not fully expose the model to the states it will encounter at inference time.

## The distribution mismatch

Standard denoising objectives construct noisy states from native structures. During generation, however, the model repeatedly consumes its own previous predictions. These on-policy states may drift away from the training distribution, especially in flexible loops where local deviations can alter the geometry of the antigen-facing interface.

This suggests a simple principle:

> If deployment follows model-generated trajectories, post-training should learn from those trajectories too.

## The ABOPD perspective

[ABOPD](https://arxiv.org/abs/2607.18835) applies this idea to antibody CDR design through on-policy distillation. The student explores states produced by its own denoising process, while privileged native geometry provides fine-grained structural supervision. The aim is not merely to imitate a final structure, but to correct the trajectory before errors compound.

On RAbD CDR-H3 generation, this approach reduces backbone RMSD from 2.37 Å to 1.95 Å and outperforms supervised fine-tuning and offline distillation controls. More broadly, the result points to a useful connection between protein generative modeling and post-training methods developed for modern language models: both benefit from aligning training with the states visited during actual generation.

## What I want to explore next

- How should on-policy data be selected when structural quality and sequence diversity conflict?
- Can trajectory-level preference signals complement native-geometry supervision?
- How well does the approach transfer from CDR-H3 generation to broader protein design tasks?

The paper, code, and model resources are available on [arXiv](https://arxiv.org/abs/2607.18835), [GitHub](https://github.com/little1d/ABOPD), and [Hugging Face](https://huggingface.co/collections/little1d/abopd).
