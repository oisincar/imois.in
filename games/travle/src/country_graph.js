// class CountryGraph {
//     constructor(puzzle_ix, start, target, shortest_solution) {
//         this.puzzle_ix = puzzle_ix;
//         this.start_country = start;
//         this.target_country = target;
//         this.shortest_solution = shortest_solution;

//         this.highlighted_country = this.start_country;
//     }

//     get_adjacent_countries(id) {
//         if (id in COUNTRY_ADJACENCY) {
//             return COUNTRY_ADJACENCY[id];
//         }
//         return [];
//     }

//     // From the current game state, how many guesses required to solve the board
//     minimum_guesses_to_solve() {
//         // return this.minimum_guesses_to_join(this.start_country, this.target_country);
//         return this.dijkstras(...)
//     }

//     // From the current game state, how many guesses required to join these two countries.
//     minimum_guesses_to_join(start_country, target_country) {
//         return this.dijkstras(...)
//     }

//     dijkstras(start_country, target_country, use_guesses) {
//         // Map country id to distance from the start.
//         var dist = {};
//         // same, to prev country
//         var prev = {};
//         var visited = new Set();

//         var queue = [start_country];

//         // Countries we consider that we've already guessed.
//         var givenCountries = use_guesses ? new Set(this.visible_countries) : new Set();

//         while (queue.length > 0) {
//             // console.log(queue.map(c => COUNTRY_ID_DATA_LOOKUP[c].properties.NAME_EN));

//             var country = queue.shift();
//             if (visited.has(country)) continue;
//             visited.add(country);

//             if (country === target_country) {
//                 break;
//             }

//             // If this country has already been guessed, then we can access
//             // neighbors for free.
//             for (const n of this.get_adjacent_countries(country)) {
//                 if (!visited.has(n)) {

//                     if (prev[n] == null) {
//                         prev[n] = country;
//                     }

//                     // Ghetto-ist priority queue... Just prepend when there's a cost of 0.
//                     // This is (surprisingly) suffecient to guarante we hit all nodes in the correct order.
//                     // See: Equivariant property of this loop is that all nodes in the queue are either the
//                     // same distance as the currently explored node, or one further.
//                     if (givenCountries.has(n)) {
//                         queue.unshift(n);
//                     }
//                     else {
//                         queue.push(n);
//                     }

//                 }
//             }
//         }

//         // Reconstruct!
//         var n = target_country;
//         var path = [];
//         while (n != null) {
//             path.push(n);
//             n = prev[n];
//         }
//         path = path.reverse();

//         if (path[0] !== start_country) {
//             return {
//                 "path": null,
//                 "guessesNeeded": null,
//                 "cost": -1,
//             }
//         }

//         // Get path cost
//         var cost = 0;
//         var guessesNeeded = [];
//         for (const c of path) {
//             if (!givenCountries.has(c)) {
//                 cost += 1;
//                 guessesNeeded.push(c);
//             }
//         }

//         return {
//             "path": path,
//             "guessesNeeded": guessesNeeded,
//             "cost": cost,
//         };
//     }
// }
