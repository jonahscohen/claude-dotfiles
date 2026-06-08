const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return [
    // Plugin sandbox bundle (code.js)
    {
      name: 'plugin',
      mode: argv.mode || 'development',
      devtool: false,
      entry: './src/plugin/controller.ts',
      output: {
        filename: 'code.js',
        path: path.resolve(__dirname, 'dist'),
        clean: false,
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          },
        ],
      },
      resolve: {
        extensions: ['.ts', '.js'],
        alias: {
          '@plugin': path.resolve(__dirname, 'src/plugin'),
        },
      },
    },

    // UI iframe bundle (ui.html with inlined JS/CSS)
    {
      name: 'ui',
      mode: argv.mode || 'development',
      devtool: isProduction ? false : 'inline-source-map',
      entry: './src/ui/main.tsx',
      output: {
        filename: 'ui.js',
        path: path.resolve(__dirname, 'dist'),
        clean: false,
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
          },
          {
            test: /\.css$/,
            use: [
              'style-loader',
              'css-loader',
              'postcss-loader',
            ],
          },
        ],
      },
      resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
          '@ui': path.resolve(__dirname, 'src/ui'),
          '@plugin': path.resolve(__dirname, 'src/plugin'),
        },
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: './src/ui/index.html',
          filename: 'ui.html',
          inject: 'body',
          inlineSource: '.(js|css)$',
          cache: false,
        }),
        new HtmlInlineScriptPlugin(),
      ],
    },
  ];
};
