# Phylogenetic-Composer
A website using three.js, the Web Audio API, and the Open Tree of Life to generate music procedurally.

The goal of this project is twofold:

1. To create an online interface between the data from the Open Tree of Life and associated Wikipedia articles

2. To generate musical information through the interaction with the Phylogenetic Composer interface

Currently, this project more or less fulfills this original vision, though there are still numerous issues to address:

1. Phylogenetic trees from the Open Tree of Life are currently implemented through simple Newick string parsing. These strings are simply included directly in the JavaScript files as string variables. Although this solution is simple and functional, it's far from perfect. Ideally, the website would interface with the API directly and request node information as the user interacts with the tree.
2. As a result of using simple string variables for phylogenetic information, tree sizes are greatly limited. Users can only explore smaller subtrees of the entire tree of life. Ideally, they would have access to the entire tree though one seamless interface. This also ties into the issue of interfacing directly with the API.
3. Currently, the musical information generated is entirely random (within a set of constraints). The links between species/taxon nodes and their associated musical forms should be more "semantic". In the end this will probably mean using ASCII values from node names to control pitch/envelope values.
4. The site isn't currently checking for any kind of compatibility issues/browser types, etc...
5. Code needs to be cleaned up significantly.
