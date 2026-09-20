load(
    "//babel/private:babel_preprocess.bzl",
    _babel_preprocess = "babel_preprocess",
)
load(
    "//babel/private:npm_install.bzl",
    _npm_install = "npm_install",
)

babel_preprocess = _babel_preprocess
npm_install = _npm_install
