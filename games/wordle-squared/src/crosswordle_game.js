"use strict";

const GAMEPLAY_STATE_ONGOING = "ongoing";
const GAMEPLAY_STATE_LOST = "lost";
const GAMEPLAY_STATE_WON = "won";

const TILE_STATE_CORRECT = "correct";
const TILE_STATE_ELSEWHERE = "wrong-location";
const TILE_STATE_ELSEWHERE_MAYBE = "wrong-location-maybe";
const TILE_STATE_WRONG = "wrong";

const LETTER_STATE_MAYBE = "letter-maybe";
const LETTER_STATE_NO = "letter-not-present";
// const LETTER_STATE_UNKNOWN = "letter-unknown";

// Creates a simple dictionary to hold the game state
function createGameState(solution_array) { // List of strings (rows), each of the same length
    let state = {};
    state.solution = solution_array;

    state.dimX = solution_array[0].length;
    state.dimY = solution_array.length;

    state.tiles = {};

    for (let j = 0; j < state.dimY; j++) {
        for (let i = 0; i < state.dimX; i++) {
            var c = solution_array[j][i];
            if (c != ' ') {
                state.tiles[ [i, j] ] = {
                    solution: c,
                    guesses: [],
                    solved: false,
                    position: [i, j],
                };
            }
        }
    }

    state.gameplay_state = GAMEPLAY_STATE_ONGOING;
    state.num_guesses = 0;
    return state;
}

class CrosswordleGame {
    constructor(guess_list, game_state) {
        this.guess_list = guess_list;
        this.state = game_state;
    }

    static FromSolution(guess_list, solution_array) {
        return new CrosswordleGame(
            guess_list,
            createGameState(solution_array)
        );
    }

    getTile(x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y))
            console.log("ERROR INVALID TILE REQUEST: ", [x, y]);

        let t = this.state.tiles[[x, y]];
        console.assert(t);
        return t;
    }

    // Guess is all letters that make up a word, even if some are already completed in board
    // [{'letter': , 'position': }]
    makeGuess(guess) {
        if (this.state.gameplay_state != GAMEPLAY_STATE_ONGOING) {
            return {
                "success": false,
                "reason": "Game Over"
            }
        }

        let word = guess.reduce((word, letter_guess) => {
            return word + letter_guess.letter;
        }, "");

        if (!this.guess_list.has(word)) {
            return {
                "success": false,
                "reason": "'" + word + "' is not in word list",
            }
        }

        // Find tiles to update... (parts of guess that weren't solved)
        var update_tiles = guess
            .filter(letter_guess => !this.state.tiles[letter_guess.position].solved);

        if (update_tiles.length == 0) {
            return {
                "success": false,
                "reason": "No tiles changed",
            }
        }

        // Guess succeeded!
        this.state.num_guesses += 1;

        // Check for parts of the guess that solves things
        update_tiles.map(letter_guess => {
            let ts = this.state.tiles[letter_guess.position];
            if (letter_guess.letter == ts.solution) ts.solved = true;
        });

        // Now we can calculate 'found elsewhere' tiles correctly...
        // This does everything...
        let guess_results = update_tiles.map(letter_guess => {
            let ts = this.state.tiles[letter_guess.position];

            var visible_squares = (
                this.getWord(ts.position[0], ts.position[1], false)
                    .concat(this.getWord(ts.position[0], ts.position[1], true)));

            var is_elsewhere = visible_squares.some(tile_coord => {
                return (
                    // Unsolved tiles with the same solution as us...
                    !this.state.tiles[tile_coord].solved
                        && this.state.tiles[tile_coord].solution == letter_guess.letter);
            });

            let state = TILE_STATE_WRONG;
            if (letter_guess.letter == ts.solution) {
                state = TILE_STATE_CORRECT;
            }
            else if (is_elsewhere) {
                state = TILE_STATE_ELSEWHERE;
            }

            var guess = {
                letter: letter_guess.letter,
                state: state,
            }
            ts.guesses.push(guess);

            return {
                letter: letter_guess.letter,
                position: letter_guess.position,
                state: state,
            };
        });

        // Update orange tiles to 'maybe orange' tiles...
        var maybe_elsewhere_guesses = [];
        for (let i = 0; i < guess_results.length; i++) {
            if (guess_results[i].state == TILE_STATE_CORRECT) {
                // This tile's being changed to correct...
                let pos = guess_results[i].position;
                let l = guess_results[i].letter;

                let visible_letters =
                    this.getWord(pos[0], pos[1], true).concat(
                        this.getWord(pos[0], pos[1], false));

                for (let l_ix = 0; l_ix < visible_letters.length; l_ix++) {
                    // Go through past guesses for this tile
                    var ts = this.state.tiles[visible_letters[l_ix]];
                    for (let g_ix = 0; g_ix < ts.guesses.length; g_ix++) {
                        var guess = ts.guesses[g_ix];
                        if (guess.letter == l && guess.state == TILE_STATE_ELSEWHERE) {
                            // Found a guess to update!
                            guess.state = TILE_STATE_ELSEWHERE_MAYBE;
                            maybe_elsewhere_guesses.push({
                                'position': visible_letters[l_ix],
                                'guess_ix': g_ix,
                            });

                        }
                    }
                }
            }
        }

        this.updateWinLose();

        return {
            "success": true,
            "tiles_changed": guess_results,
            "maybe_elsewhere": maybe_elsewhere_guesses,
        }
    }

    // Returns a list of coords of tiles containing the tile at x, y. In order.
    getWord(x, y, selectRow) {
        var dir = selectRow ? [1, 0] : [0, 1];

        // Go to start of word
        while ([x - dir[0], y - dir[1]] in this.state.tiles) {
            x -= dir[0];
            y -= dir[1];
        }

        var coords = [];
        while ([x, y] in this.state.tiles) {
            coords.push([x, y]);
            x += dir[0];
            y += dir[1];
        }

        return coords;
    }

    // Grid coord -> things we know about about it.
    getLetterStates(x, y) {
        if (!([x,y] in this.state.tiles)) {
            console.log("INVALID letter state query");
            return null;
        }
        let letters = new Set();
        this.getWord(x, y, true).forEach(pos => letters.add(pos))
        this.getWord(x, y, false).forEach(pos => letters.add(pos))
        letters.delete([x, y]);

        let res_set = {};
        var self = this;
        letters.forEach(pos => {
            var ts = self.state.tiles[pos];
            ts.guesses.forEach(guess => {

                var l = guess.letter;

                if (guess.state == TILE_STATE_WRONG) {
                    res_set[l] = LETTER_STATE_NO;
                }
                else if ((guess.state == TILE_STATE_ELSEWHERE
                         || guess.state == TILE_STATE_ELSEWHERE_MAYBE) && !(pos in res_set))
                {
                    // Maybe! (and we haven't previously marked this tile)
                    res_set[l] = LETTER_STATE_MAYBE;
                }
            });
        });

        // Guesses we know aren't correct from the current tile.
        self.state.tiles[[x, y]].guesses.forEach(guess => {
            if (guess.state == TILE_STATE_ELSEWHERE || guess.state == TILE_STATE_ELSEWHERE_MAYBE || TILE_STATE_WRONG) {
                res_set[guess.letter] = LETTER_STATE_NO;
            }
        });

        // let res = [];
        // for (const [letter, state] of Object.entries(res_set)) {
        //     res.push({
        //         "letter": letter,
        //         "state": state,
        //     });
        // }

        return res_set;
    }

    updateWinLose() {
        var unsolved_tile = false;
        // TODO: How do you loose? Is it running out of guesses on any one or ..?
        // For now... Kick people if they've used up all guesses anywhere.
        var tile_with_no_guesses = false;
        for (const [tile_coord, state] of Object.entries(this.state.tiles)) {
            if (!state.solved) unsolved_tile = true;
            if (!state.solved && state.guesses.length == 9) tile_with_no_guesses = true;
        }

        if (!unsolved_tile) {
            this.state.gameplay_state = GAMEPLAY_STATE_WON;
        }
        else if (tile_with_no_guesses) {
            this.state.gameplay_state = GAMEPLAY_STATE_LOST;
        }
    }

    getSolutionBreakdown() {
        let letters = ["🇦​","🇧​","🇨​","🇩​","🇪​","🇫​","🇬​","🇭​","🇮​","🇯​","🇰​","🇱​","🇲​","🇳​","🇴​","🇵​","🇶​","🇷​","🇸​","🇹​","🇺​","🇻​","🇼​","🇽​","🇾​","🇿​"];
        let a_ix = "a".charCodeAt(0);

        var desc = [];
        for (var j = 0; j < this.state.dimY; j++) {
            var row = "";
            for (var i = 0; i < this.state.dimX; i++) {
                if ([i, j] in this.state.tiles) {
                    var l_ix = this.state.tiles[[i, j]].solution.charCodeAt(0);
                    console.log(l_ix - a_ix);
                    row += letters[l_ix - a_ix];
                    // row += " ";
                }
                else {
                    row += "⬛";
                }
            }
            desc.push(row);
        }
        return desc;
    }

    // The sharable description of the game...
    // Returns a list of rows
    getBoardBreakdown() {
        var desc = [];
        for (var j = 0; j < this.state.dimY; j++) {
            var row = "";
            for (var i = 0; i < this.state.dimX; i++) {
                if ([i, j] in this.state.tiles) {
                    var ts = this.state.tiles[[i, j]];
                    if (ts.solved) {
                        // Pick num tile
                        var nums = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
                        row += nums[ts.guesses.length];
                    }
                    else if (ts.guesses.length < 9) {
                        row += "🟨";
                    }
                    else {
                        row += "🟥";
                    }
                }
                else {
                    // Empty square
                    row += "⬛";
                }
            }
            desc.push(row);
        }
        return desc;
    }
}

// If we're running under Node,
if(typeof exports !== 'undefined') {
    exports.CrosswordleGame = CrosswordleGame;
    exports.GAMEPLAY_STATE_ONGOING = GAMEPLAY_STATE_ONGOING;
    exports.GAMEPLAY_STATE_LOST = GAMEPLAY_STATE_LOST;
    exports.GAMEPLAY_STATE_WON = GAMEPLAY_STATE_WON;

    exports.TILE_STATE_CORRECT = TILE_STATE_CORRECT
    exports.TILE_STATE_ELSEWHERE = TILE_STATE_ELSEWHERE
    exports.TILE_STATE_WRONG = TILE_STATE_WRONG
}
