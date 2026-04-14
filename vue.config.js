
class RemoveNewFunctionPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('RemoveNewFunctionPlugin', (compilation, callback) => {
      Object.keys(compilation.assets).forEach(filename => {
        if (filename.endsWith('.js')) {
          const asset = compilation.assets[filename];
          let source = asset.source().toString();

          // 替换 new Function("return this") 为直接返回 self
          source = source.replace(
            /new Function\("return this"\)\(\)/g,
            '(function() { return typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : this; })()'
          );

          // 更新资源
          compilation.assets[filename] = {
            source: () => source,
            size: () => source.length
          };
        }
      });
      callback();
    });
  }
}

module.exports = {
  // 禁用 ESLint
  lintOnSave: false,

  // 使用 runtime-only 构建，禁用模板编译器
  runtimeCompiler: false,

  // 禁止生成js sourceMap文件
  productionSourceMap: false,

  // 修复 transpileDependencies 问题
  transpileDependencies: [],

  // webpack 性能优化提示
  configureWebpack: {
    // 禁用 source map 的 eval 模式，符合 Manifest V3 CSP
    devtool: false,
    output: {
      // 修复 CSP 问题：避免使用 new Function()
      globalObject: 'self'
    },
    resolve: {
      alias: {
        // 使用 runtime-only 版本的 Vue，避免模板编译器使用 eval
        'vue$': 'vue/dist/vue.runtime.esm-bundler.js'
      }
    },
    optimization: {
      minimizer: [
        (compiler) => {
          const TerserPlugin = require('terser-webpack-plugin');
          new TerserPlugin({
            terserOptions: {
              compress: {
                // 移除 new Function 调用
                pure_funcs: []
              },
              mangle: true
            }
          }).apply(compiler);
        }
      ]
    },
    performance: {
      hints: 'warning',
      // 入口最大值
      maxEntrypointSize: 1024000,
      // 生成的资源文件最大值
      maxAssetSize: 1024000,
      // 只针对js文件给出性能优化提示
      assetFilter: function (assetFilename) {
        return assetFilename.endsWith(".js")
      }
    }
  },

  pages: {
    popup: {
      entry: 'src/modules/popup/main.js',
      template: 'public/popup.html',
      filename: 'popup.html',
      title: 'popup'
    },
    options: {
      entry: 'src/modules/options/main.js',
      template: 'public/options.html',
      filename: 'options.html',
      title: 'options'
    },
    background: {
      entry: 'src/background.js',
      filename: 'background.js'
    }
  },

  chainWebpack: config => {
    // 移除 background 的 HTML 插件，因为 Service Worker 不需要 HTML
    config.plugins.delete('html-background')
    config.plugins.delete('preload-background')
    config.plugins.delete('prefetch-background')

    // 确保 background.js 输出到根目录且不带 hash
    config.output.filename(file => {
      if (file.chunk.name === 'background') {
        return 'background.js'
      }
      return 'js/[name].[contenthash:8].js'
    })

    // 添加自定义插件移除 new Function
    config.plugin('remove-new-function').use(RemoveNewFunctionPlugin)
  }
}
