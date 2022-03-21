// Pick out puzzle... TODO
var cw = PUZZLES_LIST[0];

var dimX = cw[0].length;
var dimY = cw.length;

// Pure data representation of state...
// In the future this could be saved/ re-loaded
function initilizeGameState(board) {
    // Tile position -> state
    var tiles_state = {}

    for (let j = 0; j < dimY; j++) {
        for (let i = 0; i < dimX; i++) {
            var c = cw[j][i];
            if (c != ' ') {
                tiles_state[ [i,j] ] = {
                    solution: c,
                    guesses: [],
                    solved: false,
                    position: [i, j],
                    current_guess: "",  // NOTE: If I serialize things this'll start breaking stuff...
                };
            }
        }
    }

    var game_state = {
        solved: false,
        tiles: tiles_state,
    }

    return game_state;
}

var game_state = initilizeGameState();
var active_is_row = true;  // Active selection direction.
var active_tiles = [];

console.log(game_state);


function createGrid(parent_div_name) {
    const parent = document.getElementById(parent_div_name)
          grid = document.createElement('div');
    grid.className = 'crosswordle';

    dom_tiles = {};

    for (let j = 0; j < dimY; j++) {
        var row = document.createElement('div');
        row.className = 'cwrow';
        grid.appendChild(row);

        for (let i = 0; i < dimX; i++) {

            var cell = document.createElement('div');
            cell.className = 'cwcell';
            row.appendChild(cell);

            var c = cw[j][i];
            if (c != ' ') {
                cell.classList.add('tile')
                cell.dataset.tile_x = i;
                cell.dataset.tile_y = j;
                dom_tiles[[i,j]] = cell;

                cell.addEventListener('click', handleTileClick, false);
            }
        }
    }
    parent.appendChild(grid);

    return dom_tiles;
}

var explanation_dom_tiles = createGrid('explanation_view');
var entry_dom_tiles = createGrid('entry_view');


function makeHistoryHintElement() {
    const tbl = document.createElement('table');
    // tbl.style.width = '100px';
    // tbl.style.border = '1px solid black';

    for (let i = 0; i < 3; i++) {
        const tr = tbl.insertRow();
        for (let j = 0; j < 3; j++) {
            const td = tr.insertCell();
            // td.style.border = '1px solid black';
            td.dataset.state = "empty";
            td.className = "explanation_tile";

            // td.appendChild(document.createTextNode(""));
        }
    }
    return tbl;
}

// Create history grid
console.log(explanation_dom_tiles);
for (const [position, tile] of Object.entries(explanation_dom_tiles)) {
    console.log(position, tile);
    // Create tiny table
    var tbl = makeHistoryHintElement();
    console.log(tile);
    tile.appendChild(tbl);
}













//////////////////////////////////////////////////////////////////////////////////


const FLIP_ANIMATION_DURATION = 500
const DANCE_ANIMATION_DURATION = 500
// const keyboard = document.querySelector("[data-keyboard]")
const alertContainer = document.querySelector("[data-alert-container]")
// const guessGrid = document.getElementById("guess_pane");
const offsetFromDate = new Date(2022, 0, 1)
const msOffset = Date.now() - offsetFromDate
const dayOffset = msOffset / 1000 / 60 / 60 / 24
// const targetWord = targetWords[Math.floor(dayOffset)]

var ui_interaction_enabled = true;
// startInteraction()

// function startInteraction() {
document.addEventListener("click", handleMouseClick)
document.addEventListener("keydown", handleKeyPress)
// }

// function stopInteraction() {
//     document.removeEventListener("click", handleMouseClick)
//     document.removeEventListener("keydown", handleKeyPress)
// }

function handleTileClick(e) {
    if (!ui_interaction_enabled) return;
    console.log("TILE CLICK");
    e.preventDefault();
    e.stopImmediatePropagation();

    var x = Number(e.currentTarget.dataset.tile_x);
    var y = Number(e.currentTarget.dataset.tile_y);
    handleTileClicked(x, y);
}

function handleMouseClick(e) {
    if (!ui_interaction_enabled) return;

    deselectTiles();

    // KB stuff
    // if (e.target.matches("[data-key]")) {
    //     pressKey(e.target.dataset.key)
    //     return
    // }

    // if (e.target.matches("[data-enter]")) {
    //     submitGuess()
    //     return
    // }

    // if (e.target.matches("[data-delete]")) {
    //     deleteKey()
    //     return
    // }
}

function handleKeyPress(e) {
    if (!ui_interaction_enabled) return;

    if (e.key === "Enter") {
        submitGuess()
        return
    }

    if (e.key === "Backspace" || e.key === "Delete") {
        deleteKey()
        return
    }

    if (e.key.match(/^[a-z]$/)) {
        pressKey(e.key)
        return
    }
}


const checkArray = (arrays, array) => arrays.some(a => {
  return (a.length > array.length ? a : array).every((_, i) => a[i] === array[i]);
});

function tileIsActive(x, y) {
    return checkArray(active_tiles, [x,y]);
}

function handleTileClicked(x, y) {
    var should_select_row = !(tileIsActive(x, y) && active_is_row);

    deselectTiles();

    var t = game_state.tiles[[x, y]];
    if (t.solved) {
        console.log("Clicked solved tile");
        return;
    }


    var word = getWord(x, y, should_select_row);

    // Don't select 1-long words
    if (word.length <= 1) {
        should_select_row = !should_select_row;
        word = getWord(x, y, should_select_row);
    }

    selectTiles(word);

    active_is_row = should_select_row;
    active_tiles = word;

    console.log(word);
    // console.log(t);
    // Expand selection
}


function deselectTiles() {
    active_tiles.map(t => {
        // Remove selection css
        entry_dom_tiles[t].classList.remove("selected");
        explanation_dom_tiles[t].classList.remove("selected");

        // Remove any letters, but only from unsolved tiles
        if (game_state.tiles[t].solved) return;

        game_state.tiles[t].current_guess = "";

        delete explanation_dom_tiles[t].dataset.state;
        var entry_tile = entry_dom_tiles[t];
        delete entry_tile.dataset.state;

        // TODO: Fade out
        delete entry_tile.dataset.letter;
        entry_tile.textContent = "";
    })
    active_tiles = [];
}

function selectTiles(tileCoords) {
    var explan = tileCoords.map(letter_coord => {
        var t = explanation_dom_tiles[letter_coord];
        t.classList.add("selected");
        // t.dataset.state = "selected";
    });
    var entry = tileCoords.map(letter_coord => {
        var t = entry_dom_tiles[letter_coord];
        t.classList.add("selected");
        // t.dataset.state = "selected";
    });
}

// Returns a list of coords of tiles containing the tile at x, y. In order.
function getWord(x, y, selectRow) {
    var dir = selectRow ? [1, 0] : [0, 1];

    // Go to start of word
    while ([x - dir[0], y - dir[1]] in game_state.tiles) {
        x -= dir[0];
        y -= dir[1];
    }

    var letters = [];
    while ([x, y] in game_state.tiles) {
        letters.push([x, y]);
        x += dir[0];
        y += dir[1];
    }

    return letters;
}

function pressKey(key) {
    if (active_tiles.length == 0) return;

    // Find first tile that doesn't have a letter in it already
    var first_tile = null;
    for (var i = 0; i < active_tiles.length; i++) {
        var tile_state = game_state.tiles[active_tiles[i]];

        if (!tile_state.solved && tile_state.current_guess == "") {
            first_tile = active_tiles[i];
            break;
        }
    }

    if (first_tile == null) {
        // Rest of word is completed, just return.
        console.log("Done");
        return;
    }
    var tile = entry_dom_tiles[first_tile];

    tile.dataset.letter = key.toLowerCase();
    tile.textContent = key;
    game_state.tiles[first_tile].current_guess = key.toLowerCase();
}

function deleteKey() {

    // Find last tile in word that's not solved
    var last_tile = null;
    for (var i = active_tiles.length-1; i >= 0; i--) {
        var tile_state = game_state.tiles[active_tiles[i]];
        if (!tile_state.solved && tile_state.current_guess != "") {
            last_tile = active_tiles[i];
            break;
        }
    }

    if (last_tile == null) {
        return
    };

    var tile = entry_dom_tiles[last_tile];
    tile.textContent = "";
    delete tile.dataset.letter;

    game_state.tiles[last_tile].current_guess = "";
}

function submitGuess() {
    // All letters entered...
    var is_valid_guess = active_tiles.every(tile_coord => {
        var state = game_state.tiles[tile_coord];
        return state.solved || state.current_guess != "";
    });

    if (!is_valid_guess) {
        showAlert("Not enough letters");
        shakeTiles(active_tiles.map(tile_coord => entry_dom_tiles[tile_coord]));
        return;
    }

    var guess = active_tiles.reduce((word, tile_coord) => {
        var ts = game_state.tiles[tile_coord];
        var letter = ts.solved ? ts.solution : ts.current_guess;
        return word + letter;
    }, "");

    if (!GUESS_LIST.has(guess)) {
        console.log("Not a word:", guess);
        shakeTiles(active_tiles.map(tile_coord => entry_dom_tiles[tile_coord]));
        return;
    }

    console.log("Successfully guessed:", guess);

    // Disable interaction while stuff is animated.
    ui_interaction_enabled = false;

    // Map/filter/map to get only the tiles we want to update.
    // This to get the correct letter_index for animating the transition.
    var changed_letters = active_tiles
        .map(tile_coord => game_state.tiles[tile_coord])
        .filter(ts => !ts.solved)
        .map((ts, letter_index) => {

            // TODO: Fix how this works?
            // Currently shows yellow if e.g.
            // guess: books
            // actual: otter
            // Both o's will show as yellow.
            // Arguably this is better as the 'info' board shows
            // correct info always.

            console.log(ts.position[0], ts.position[1]);
            var visible_squares = (
                getWord(ts.position[0], ts.position[1], false)
                    .concat(getWord(ts.position[0], ts.position[1], true)));

            var is_elsewhere = visible_squares.some(tile_coord => {
                return game_state.tiles[tile_coord].solution == ts.current_guess;
            });

            var guess = {
                character: ts.current_guess,
                is_solved: (ts.current_guess == ts.solution),
                is_elsewhere: is_elsewhere, // TODO
            }
            ts.guesses.push(guess);
            ts.solved = guess.is_solved;

            // TODO: count guesses in a square and let the user 'die'.
            updateUI(ts.position, letter_index, guess.character, guess.is_solved, guess.is_elsewhere);

            return letter_index;
    });

    // This is pretty dumb... But calculate when the UI animation would finish then check if we won.
    var time_until_animation_finishes = (changed_letters.length + 1) * FLIP_ANIMATION_DURATION * 0.5;

    setTimeout(() => {
        ui_interaction_enabled = true;  // This may be instantly set to false in checkWinLoose.
        checkWinLose();
    }, time_until_animation_finishes);

}

// NOTE: Could modify this to allow deserialization of game state.
function updateUI(tile_coord, letter_index, character_guessed, is_solved, is_elsewhere) {
    var entryTile = entry_dom_tiles[tile_coord];

    var infoTile = explanation_dom_tiles[tile_coord];
    var guessSquares = infoTile.querySelectorAll('[data-state="empty"]');
    console.log(guessSquares);

    // guessSquares[0].appendChild(document.createTextNode(character_guessed));
    guessSquares[0].textContent = character_guessed;
    var state;
    if (is_solved) {
        state = "correct";
    }
    else if (is_elsewhere) {
        state = "wrong-location";
    }
    else {
        state = "wrong";
    }
    flipTile(entryTile, letter_index, state);
    flipTile(guessSquares[0], letter_index, state);
    // entryTile.dataset.state = state;
    // guessSquares[0].dataset.state = state;
}

function flipTile(tile, letter_index, state) {
    // const letter = tile.dataset.letter
    // const key = keyboard.querySelector(`[data-key="${letter}"i]`)
    setTimeout(() => {
        tile.classList.add("flip");
    }, (letter_index * FLIP_ANIMATION_DURATION) / 2)

    tile.addEventListener(
        "transitionend",
        () => {
            tile.classList.remove("flip")
            tile.dataset.state = state;
            // if (targetWord[index] === letter) {
            //     tile.dataset.state = "correct"
            //     key.classList.add("correct")
            // } else if (targetWord.includes(letter)) {
            //     tile.dataset.state = "wrong-location"
            //     key.classList.add("wrong-location")
            // } else {
            //     tile.dataset.state = "wrong"
            //     key.classList.add("wrong")
            // }
        },
        { once: true }
    )
}

// function flipTile(tile, index, array, guess) {
//     const letter = tile.dataset.letter
//     const key = keyboard.querySelector(`[data-key="${letter}"i]`)
//     setTimeout(() => {
//         tile.classList.add("flip")
//     }, (index * FLIP_ANIMATION_DURATION) / 2)

//     tile.addEventListener(
//         "transitionend",
//         () => {
//             tile.classList.remove("flip")
//             if (targetWord[index] === letter) {
//                 tile.dataset.state = "correct"
//                 key.classList.add("correct")
//             } else if (targetWord.includes(letter)) {
//                 tile.dataset.state = "wrong-location"
//                 key.classList.add("wrong-location")
//             } else {
//                 tile.dataset.state = "wrong"
//                 key.classList.add("wrong")
//             }

//             if (index === array.length - 1) {
//                 tile.addEventListener(
//                     "transitionend",
//                     () => {
//                         startInteraction()
//                         checkWinLose(guess, array)
//                     },
//                     { once: true }
//                 )
//             }
//         },
//         { once: true }
//     )
// }

function showAlert(message, duration = 1000) {
    const alert = document.createElement("div")
    alert.textContent = message
    alert.classList.add("alert")
    alertContainer.prepend(alert)
    if (duration == null) return

    setTimeout(() => {
        alert.classList.add("hide")
        alert.addEventListener("transitionend", () => {
            alert.remove()
        })
    }, duration)
}

function shakeTiles(tiles) {
    tiles.forEach(tile => {
        tile.classList.add("shake")
        tile.addEventListener(
            "animationend",
            () => {
                tile.classList.remove("shake")
            },
            { once: true }
        )
    })
}

function checkWinLose() {
    game_state.tiles

    var unsolved_tile = false;
    // TODO: How do you loose? Is it running out of guesses on any one or ..?
    // For now... Kick people if they've used up all guesses anywhere.
    var tile_with_no_guesses = false;
    for (const [tile_coord, state] of Object.entries(game_state.tiles)) {
        if (!state.solved) unsolved_tile = true;
        if (state.guesses.length == 9) tile_with_no_guesses = true;
    }

    if (!unsolved_tile) {
        win();
    }
    else if (tile_with_no_guesses) {
        loose();
    }
}

function win() {
    // Ya win!
    showAlert("You Win", 5000);
    danceTiles(Object.values(explanation_dom_tiles));
    danceTiles(Object.values(entry_dom_tiles));

    ui_interaction_enabled = false;
}

function loose() {
    // Ya loose :c
    showAlert("No guesses remaining :c. Better luck tommorow.", null)
    ui_interaction_enabled = false;
}

function danceTiles(tiles) {
    tiles.forEach((tile, index) => {
        setTimeout(() => {
            tile.classList.add("dance")
            tile.addEventListener(
                "animationend",
                () => {
                    tile.classList.remove("dance")
                },
                { once: true }
            )
        }, (index * DANCE_ANIMATION_DURATION) / 5) % DANCE_ANIMATION_DURATION
    })
}
