# Stage Artifacts

Stage execution writes validated outputs into this directory.
Each stage contract declares the canonical artifact paths and required sections.
The active runtime stage outputs use numbered filenames such as `01-understand.md` through `06-validate.md`.
Additional checked-in markdown files in this directory may exist as repository-local design or historical artifacts for developing Prodify itself; they are not all part of fresh `prodify init` output.
