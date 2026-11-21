# Vendored three.js

Everything here is copied from the `three` npm package (r169, MIT) so the app runs completely
offline, with no CDN or bundler:

| File | Original |
| --- | --- |
| `three.module.js` | `build/three.module.min.js` |
| `OrbitControls.js` | `examples/jsm/controls/OrbitControls.js` |
| `TransformControls.js` | `examples/jsm/controls/TransformControls.js` |

The bare specifier `three` is mapped to `./three.module.js` by the import map in `index.html`.
Licence: see [LICENSE](LICENSE).
