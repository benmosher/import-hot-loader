module.exports = function importHotLoader(source/*todo: map*/) {
  // step 1: parse
  // step 2: find imports
  // step 3: write 'dynamic' map, rewrite all references to imports to it
  // step 4: write module.hot acceptors (possibly as a runtime reference)

  // may want to:
  // - check for assigments/closures and react appropriately
}