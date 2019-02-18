PS-WASM: Rendering PostScript in browsers using GhostScript.

This little wrapper allows GhostScript to be run with WebAssembly in browser,
and thus allows PostScript files to be opened with modern browsers directly.

Currently only Chrome is supported.

------

TODO:
* Allow refreshing of the viewer page.
* Fix URL display, if possible.

------

Note on cross-compilation:

Cross-compiling ghostscript was the nontrivial part of this project.

After obtaining the source code from the [source repository](https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs926/ghostscript-9.26.tar.gz), one needs to copy files in the "code_patch" folder into their respective places.

One also needs to have the EMScripten environment set up; see [here](https://webassembly.org/getting-started/developers-guide/) for a tutorial.

Then one can run the following command for setting up configure:

`emconfigure ./configure --disable-threading --disable-cups --disable-dbus --disable-gtk --with-drivers=PS CC=emcc CCAUX=gcc --with-arch_h=~/ghostscript-9.26/arch/wasm.h`

Followed by the following "make" command:

`emmake make XE=".html" GS_LDFLAGS="-s ALLOW_MEMORY_GROWTH=1 -s EXIT_RUNTIME=1"`

And one needs to copy everything from the "bin" folder to the extension folder.

To include debugging information, instead use the following command, and look for results in "debugbin" (make sure you also copy the map files into the extension folder):

`emmake make debug XE=".html" GS_LDFLAGS="-s ALLOW_MEMORY_GROWTH=1 -s EXIT_RUNTIME=1 -s ASSERTIONS=2 -g4"`

------

Ocha 2019. Code licensed under AGPLv3.

GhostScript is released by Artifex under AGPLv3 and can be found [here](https://www.ghostscript.com/).

Pako is written by Andrey Tupitsin and Vitaly Puzrin and can found [here](https://github.com/nodeca/pako).
