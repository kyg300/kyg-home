export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
      const tsSpecifier = specifier.endsWith('.js') ? specifier.replace(/\.js$/, '.ts') : `${specifier}.ts`
      return nextResolve(tsSpecifier, context)
    }
    throw err
  }
}
