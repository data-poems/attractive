# Browser dependencies

The app source, including the 3D view, equation reference, point inspection, lessons and Lyapunov estimator, is copyright 2026 Luke Steuber under the root MIT license.

- Three.js 0.149.0: MIT, copyright the three.js authors. `vendor/three/three.min.js` is the unmodified browser build from the official npm `three@0.149.0` package. Its license is `vendor/three/LICENSE`.
- KaTeX 0.16.11: MIT, copyright Khan Academy and other contributors. `vendor/katex/` contains the unmodified browser script, CSS and fonts from the official npm `katex@0.16.11` package. Its license is `vendor/katex/LICENSE`.
- Rough.js 4.6.6 is the existing optional drawing dependency loaded from jsDelivr; MIT, copyright Preet Shihn. Source and license: https://github.com/rough-stuff/rough/tree/v4.6.6

The mathematical reference uses equations for Lorenz, Rössler, Chen, Aizawa, Thomas and Halvorsen systems. Numerical readouts are estimates for the selected parameters and integration convention.
