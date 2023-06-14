import { defineConfig } from 'tsup'
// @ts-expect-error Cannot find module
import { join } from 'path'

export default defineConfig({
  esbuildPlugins: [{
    name: 'graphql-cjs-esm',
    setup(build) {
      build.onResolve({ filter: /graphqlInternals/ }, (args) => {
        // make sure the imports in graphqlInternals.ts are correctly importing cjs or esm
        if (build.initialOptions.format === 'cjs') {
          return {
            path: join(args.resolveDir, args.path + '.cjs.ts'),
          }
        }
      })
    }
  }]
})
