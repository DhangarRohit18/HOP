# Car Concept 3D Dashboard — Interactive 3D Vehicle Viewer

An interactive, browser-based 3D viewer showcasing a detailed concept car model with material variants, animated mechanical parts, and real-time interactive controls. Built with Three.js using an open-source Sketchfab-origin automotive asset optimised for web delivery by the Khronos Group.

This project was created using [NebulaCloud Studio](https://nebulacloud.studio), an agentic application-building platform for engineering, geospatial, and interactive 3D workflows.

[![Car Concept 3D Dashboard](assets/social-preview.png)](https://studio-public-demos.github.io/car-concept-3d-dashboard/)

**[Open Live Demo](https://studio-public-demos.github.io/car-concept-3d-dashboard/)**

## What It Does

| Capability | Description |
|---|---|
| 3D Model Display | Loads and renders a production-quality concept car GLB model with PBR materials, clearcoat paint, and interior detail |
| Material Variants | Switch between three factory paint finishes: Carmine Candy (red), Pearly Swirly (white), and Torched Graphite (dark) |
| Animated Doors | Open and close both left and right scissor doors with smooth interpolation |
| Animated Hood | Raise and lower the front hood to reveal the engine bay |
| Animated Hatch | Open and close the rear hatch panel |
| Wheel Spin | Continuously rotate all four wheels — standalone or during the drive loop |
| Drive Loop | Oscillate the car side-to-side in a looping motion with wheel spin |
| Explode View | Disassemble the car body panels outward for an exploded parts view |
| Turntable Mode | Auto-rotate the entire model on a platform for hands-free viewing |
| Free Orbit | Click-and-drag orbit controls with zoom and pan |
| Camera Presets | Jump to predefined views: Front, Back, Side, Top, and Interior |
| Lighting Control | Adjust scene brightness with a real-time slider |
| Wireframe Toggle | Switch between solid and wireframe rendering of all meshes |
| Screenshot Capture | Export the current view as a PNG image |
| Responsive Layout | Adaptive panel layout with hamburger menu on mobile, full-screen support |
| Keyboard Shortcuts | Full keyboard control for all animations and camera presets |

## Why It Matters

Sharing high-fidelity 3D automotive models typically requires specialist CAD software, large desktop applications, or platform-specific viewers. This dashboard demonstrates how a production-quality car asset — originally from Sketchfab and optimised by the Khronos Group — can be delivered through a standard web browser with zero installation.

The interactive controls make it practical for design reviews, stakeholder presentations, and client demonstrations where viewers need to inspect details, compare material options, and understand mechanical articulation without access to specialised tools.

By combining the glTF standard with Three.js WebGL rendering, the project achieves the visual quality of desktop viewers while remaining instantly accessible through a URL — making it suitable for embedding in documentation, sharing as a portable deliverable, or hosting as a permanent web showcase.

## Intended Users

| Audience | Relevant Application |
|---|---|
| Automotive Designers | Quick visualisation of material variants and body panel articulation |
| Product Managers | Stakeholder demos without CAD software dependencies |
| 3D Content Creators | Reference implementation for glTF loading, variant switching, and part animation |
| Web Developers | Example of Three.js dashboard with complex model interaction |
| Educators | Teaching 3D web graphics, glTF ecosystem, or automotive design concepts |
| Marketing Teams | Embeddable interactive car configurator for web campaigns |

## Technical Highlights

| Capability | Technology or Method |
|---|---|
| 3D Rendering | Three.js 0.160 with WebGL, PBR materials, shadow mapping, ACES tone mapping |
| Model Format | glTF 2.0 Binary (.glb) with KHR_materials_variants, KHR_materials_clearcoat, KHR_materials_iridescence extensions |
| Mesh Compression | Draco geometry decompression for efficient network delivery |
| Animation System | Custom lerp-based interpolation targeting individual node transforms (rotations, positions) |
| Part Discovery | Hierarchical node-name traversal matching the glTF scene graph structure |
| Material Switching | Runtime material-colour modification via three.js MeshStandardMaterial colour properties |
| Camera Control | OrbitControls with configurable damping, auto-rotate, and animated camera presets |
| UI Framework | Vanilla HTML/CSS/JS with CSS custom properties, backdrop blur, and responsive grid |
| Module Loading | ES import maps from unpkg CDN (no bundler required) |
| Deployment | Static site served via GitHub Pages — zero backend, zero build step |

## Technical Scope and Limitations

- This is an **interactive visualisation**, not a physics simulation or engineering solver. All animations are pre-scripted kinematic movements.
- Material variant switching modifies base-colour properties at runtime; it does not perform full KHR_materials_variants extension resolution as specified in the glTF standard.
- The door, hood, and hatch animations use fixed rotation presets and do not account for collision detection or physical constraints.
- Drive-loop animation is a sinusoidal translation; it does not represent vehicle dynamics, suspension behaviour, or tyre-ground interaction.
- Explode-view component translation is a linear offset and does not follow the logical assembly-disassembly paths a mechanical engineer would specify.
- The model includes Khronos logo textures on body panels (as part of the original asset).
- This application should not be used for engineering validation, manufacturing specification, or safety analysis.

## Project Structure

```
/
├── index.html           # Main application (HTML + CSS + JS)
├── CarConcept.glb       # 3D car model (glTF Binary, ~11.7 MB)
├── assets/
│   ├── screenshot.png   # Application screenshot
│   └── social-preview.png # Repository social preview
├── README.md
├── LICENSE
├── ATTRIBUTIONS.md
└── .gitignore
```

## Quick Start

```bash
git clone https://github.com/studio-public-demos/car-concept-3d-dashboard.git
cd car-concept-3d-dashboard
python -m http.server 8080
```

Then open: **http://localhost:8080**

No build tools, package managers, or dependencies required. The Three.js library and Draco decoder are loaded from CDN at runtime.

## Deployment

This project is deployed using **GitHub Pages** from the repository root.

Live demo: **[https://studio-public-demos.github.io/car-concept-3d-dashboard/](https://studio-public-demos.github.io/car-concept-3d-dashboard/)**

## Attribution

### 3D Car Model

The Car Concept model is used under the **CC BY 4.0 International** licence with attribution to:
- **Darmstadt Graphics Group GmbH** and **Eric Chadwick** (glTF conversion and optimisation)
- **Unity Fan** (original Sketchfab model — Public Domain CC0)

The model was sourced from the [Khronos Group glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) repository and includes Khronos and 3D Commerce logo textures.

Full attribution details are in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

### JavaScript Libraries

- **Three.js** (MIT) — 3D rendering engine
- **Draco** (Apache 2.0) — Mesh compression decoder

## Built with NebulaCloud Studio

This project was created using [NebulaCloud Studio](https://nebulacloud.studio), an agentic application-building platform for engineering, scientific, geospatial, and interactive digital workflows.

NebulaCloud Studio helps domain professionals turn ideas, models, datasets, and algorithms into usable, deployable applications.

## Build Your Own Interactive Application

Working with 3D automotive models, CAD assets, or product configurators?

Explore the live demo and see how your technical workflow could be transformed into an interactive browser-based application.

**[Explore NebulaCloud Studio](https://nebulacloud.studio)**

## Related Demos

- [Factory BIM Viewer](https://github.com/studio-public-demos/factory-bim) — Interactive 3D Building Information Model viewer for industrial facilities
- [Stadium Digital Twin](https://github.com/studio-public-demos/stadium-digital-twin) — Interactive 3D stadium dashboard with live sensor simulation
- [Metro Station Simulator](https://github.com/studio-public-demos/metro-station-simulator) — Agent-based passenger flow simulation in a 3D metro station
- [Nefertiti 3D Viewer](https://github.com/studio-public-demos/nefertiti-viewer) — Interactive 3D monument visualisation
- [Guntur Change Detection](https://github.com/studio-public-demos/guntur-change-detection-dashboard) — Geospatial building-level change detection dashboard
