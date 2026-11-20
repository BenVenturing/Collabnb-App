# Animation Toolkit: Copy → Style → Move → Sound → Ship

18 resources. **8 are real agent skills** (copied in `plugin/skills/`, 50 skills in total). **9 are libraries/tools** (README copied in `libraries/`; install them with npm/pip/cargo/apt when needed). **1 is an API** (Openverse).

Large media (mp4/gif/webp/mp3) was left out of the copies to keep size down. Re-clone the upstream repo if you need demo videos. mg-styles-15 alone is 1.2 GB upstream, so only its prompts, rubric and template were kept.

## Agent skills (in `skills/`, installed to `~/.claude/skills/`)

| Skill | What it does | Use it when |
|---|---|---|
| **reanimate** (NiazMorshed2007) | Clones a section, widget, page or animation from a URL, screen recording, mp4/gif, Lottie or prototype export, frame by frame, into your own codebase, then re-checks the result. | "Copy this animation I saw." Start here. |
| **motion-design-skill** (LottieFiles) | Timing, easing, spacing and principles of animation, as a trained animator would apply them. Tiny (about 130 KB). | Anything feels floaty, linear or robotic. |
| **mg-styles-15** (Vincentwei1021) | 15 motion-graphics styles (flat vector, line art, isometric, 3D, cel, collage, liquid, morph, Bauhaus, synthwave, aurora glass, pixel, HUD…). One full prompt each in `prompts/`, plus `rubric.md` and `template.md`. Not a SKILL.md: paste or point Claude at a prompt. | Picking a visual style fast. |
| **huashu-art-motion** (alchaincyf) | Paintings that move: 36 implemented art styles, 16 transferable research recipes, 9 explainer-animation grammars, voiceover-driven rendering, frame-fit checks. Docs mostly in Chinese (`README.en.md` exists). | Art-style animation, explainers, rebuilding an animation. |
| **anidoodle** (alexgreensh) | Code-drawn stills, films, 3D motion graphics, explainers and web animations in 32 styles, with scores, narration and subtitles. | Doodles, loops, illustrated explainers, all in code. |
| **cinetic** (Leonxlnx) | Direct and render launch films, "vX is out" update films, product and feature videos, logo stings, UI walkthroughs, teasers. | Product and launch videos from code. |
| **motionmaxxing** (Tejashmakwana) | Senior-motion-designer direction for launch videos, promos, kinetic type, social ads and CTAs, to avoid "AI slop". Includes taste guides, templates, a library and a runtime. | Polishing or directing a promo so it doesn't look generic. |
| **remotion-skills** (remotion-dev, official) | 13 skills: best-practices router, create, captions, markup, studio, render, multimedia (Mediabunny), maps, interactivity, saas, docs, upgrade, license. | Building the actual React video project and rendering it. |
| **blender-skills** (EL4CTEO) | 28 Blender 5.x skills: core/bpy, animation, rigging, geometry nodes, lighting, PBR, rendering, simulation, weather FX, NPR, video editing, export pipelines, QA gate. Blender must be installed. | Any 3D scene or render, or a Blender MCP workflow. |

(Also in `~/.claude/skills/` from earlier: `content-principles`, for short-form scripts and hooks.)

## Libraries and tools (READMEs in `libraries/`)

| Tool | Role | Install / note |
|---|---|---|
| **Manim** (ManimCommunity) | Python library that turns formulas and diagrams into smooth math animation. | `pip install manim` |
| **three.quarks** (Alchemist0823) | Particle and VFX engine for three.js. | `npm i three.quarks` |
| **react-postprocessing** (pmndrs) | Bloom, DOF, noise, vignette and other cinematic effects for react-three-fiber. | `npm i @react-three/postprocessing` |
| **Tweakpane** (cocopon) | Compact UI panel with sliders and monitors for tuning parameters live. | `npm i tweakpane` |
| **EffectCraft** (storytold/effectcraft) | Fast Rust compositing. The cloned repo's README is branded **ArtCraft**, so check it matches what you expect before relying on it. | Rust: `cargo build` |
| **librosa** | Audio analysis: beat and tempo tracking so motion hits the beat. | `pip install librosa` |
| **WhisperX** (m-bain) | Word-level, millisecond-timed transcription for captions. | `pip install whisperx` |
| **FFmpeg** | Encode, mux and convert frames into a final video file. | `apt install ffmpeg` |
| **Openverse API** | Free sounds, music and images (`https://api.openverse.org/v1/`). No repo. | Check each result's licence and attribution. |

## Suggested pipeline

1. **Copy**: `reanimate` on the reference.
2. **Style**: `mg-styles-15` prompts, `huashu-art-motion` or `anidoodle`.
3. **Move**: `motion-design-skill` for easing, `motionmaxxing` or `cinetic` for direction, three.quarks and react-postprocessing for 3D polish, Tweakpane to tune. Blender skills for full 3D.
4. **Sound**: Openverse for audio, librosa for beat sync, WhisperX for captions (or `remotion-captions`).
5. **Ship**: Remotion (`remotion-create`, `remotion-render`) and FFmpeg.

## Using it later

- This folder is the durable copy. Restore the skills with `cp -r skills/<repo>/<path-to-skill-dir> ~/.claude/skills/<skill-name>` (the 50 installed names are the `name:` field of each SKILL.md).
- Cloud containers are ephemeral, so `~/.claude/skills` disappears with the container. Commit this folder (about 100 MB) to a repo you own, or install the skills at user level on your own machine.
- Upstream URLs: github.com/{NiazMorshed2007/reanimate, LottieFiles/motion-design-skill, Vincentwei1021/mg-styles-15, alchaincyf/huashu-art-motion, alexgreensh/anidoodle, Leonxlnx/cinetic, Tejashmakwana/motionmaxxing, ManimCommunity/manim, EL4CTEO/blender-skills, Alchemist0823/three.quarks, pmndrs/react-postprocessing, cocopon/tweakpane, storytold/effectcraft, librosa/librosa, m-bain/whisperX, remotion-dev/skills, FFmpeg/FFmpeg}

## Install anywhere (as / commands)

This repo is a Claude Code plugin marketplace. On any machine or in any session:

    /plugin marketplace add BenVenturing/Collabnb-App
    /plugin install animation-toolkit@ben-skills

Skills then appear as `/animation-toolkit:reanimate`, `/animation-toolkit:remotion-create` etc. (marketplace file is on branch `claude/keen-euler-i1nxat` until merged to the default branch).
