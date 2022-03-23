"use strict";

const GAMEPLAY_STATE_ONGOING = "ongoing";
const GAMEPLAY_STATE_LOST = "lost";
const GAMEPLAY_STATE_WON = "won";

const TILE_STATE_CORRECT = "correct";
const TILE_STATE_ELSEWHERE = "wrong-location";
const TILE_STATE_WRONG = "wrong";

class CrosswordleGameState {
    constructor(solution_array) {  // List of strings (rows), each of the same length
        this.solution = solution_array;

        this.dimX = solution_array[0].length;
        this.dimY = solution_array.length;

        this.tiles = {};

        for (let j = 0; j < this.dimY; j++) {
            for (let i = 0; i < this.dimX; i++) {
                var c = solution_array[j][i];
                if (c != ' ') {
                    this.tiles[ [i, j] ] = {
                        solution: c,
                        guesses: [],
                        solved: false,
                        position: [i, j],
                    };
                }
            }
        }

        this.gameplay_state = GAMEPLAY_STATE_ONGOING;
        this.num_guesses = 0;
    }
}

class CrosswordleGame {
    constructor(guess_list, game_state) {
        this.guess_list = guess_list;
        this.state = game_state;
    }

    static FromSolution(guess_list, solution_array) {
        return new CrosswordleGame(
            guess_list,
            new CrosswordleGameState(solution_array)
        );
    }

    // static FromJson(json) {
    //     const deserializeObject = (obj) => {
    //         return new CrosswordleGameState(obj);
    //     }
    //     // const serializeObject = (obj) => {
    //     //     return JSON.parse(JSON.stringify(rook));
    //     // }
    // }

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

        // TODO: Update orange tiles to 'maybe orange' tiles...

        this.updateWinLose();

        return {
            "success": true,
            "tiles_changed": guess_results,
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
