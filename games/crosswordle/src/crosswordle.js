"use strict";

// ----------------------------------------------
//                   SETUP
// ----------------------------------------------

function getPuzzleNumber() {
    // Crosswordle released 21th march 2022!
    const dt = Date.now() - new Date(2022, 2, 21);
    const dayOffset = dt / (1000 * 60 * 60 * 24)
    return Math.floor(dayOffset) + 1;
}

let puzzle_number = getPuzzleNumber();
console.log("Playing crosswordle #", puzzle_number);

// TODO: Load from memory?
// var game = CrosswordleGame.FromSolution(GUESS_LIST, PUZZLES_LIST[puzzle_number - 1]);
// var game = CrosswordleGame.FromSolution(GUESS_LIST, ["to", " r"]);
var game = CrosswordleGame.FromSolution(GUESS_LIST, ["to"]);

console.log(game);


function createGrid(parent_div_name) {
    const parent = document.getElementById(parent_div_name),
          grid = document.createElement('div');
    grid.className = 'crosswordle';

    var dom_tiles = {};

    for (let j = 0; j < game.state.dimY; j++) {
        var row = document.createElement('div');
        row.className = 'cwrow';
        grid.appendChild(row);

        for (let i = 0; i < game.state.dimX; i++) {

            var cell = document.createElement('div');
            cell.className = 'cwcell';
            row.appendChild(cell);

            if ([i, j] in game.state.tiles) {
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

var entry_dom_tiles = createGrid('entry_view');
var explanation_dom_tiles = createGrid('explanation_view');


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
for (const [position, tile] of Object.entries(explanation_dom_tiles)) {
    // Create tiny table
    var tbl = makeHistoryHintElement();
    tile.appendChild(tbl);
}

document.addEventListener("click", handleMouseClick)
document.addEventListener("keydown", handleKeyPress)

const alertContainer = document.querySelector("[data-alert-container]")
const jsConfetti = new JSConfetti();

const FLIP_ANIMATION_DURATION = 500
const DANCE_ANIMATION_DURATION = 500

// ----------------------------------------------
//                   GAMEPLAY
// ----------------------------------------------


var ui_interaction_enabled = true;

var active_is_row = true;  // Active selection direction.
var active_tiles = []; // Positions of currently selected word

// Position -> letter
var current_guess = {};


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

    // Stop double tap to zoom on iphone.
    e.preventDefault();
    e.stopImmediatePropagation();

    // KB stuff
    if (e.target.matches("[data-key]")) {
        pressKey(e.target.dataset.key);
    }
    else if (e.target.matches("[data-enter]")) {
        submitGuess();
    }
    else if (e.target.matches("[data-delete]")) {
        deleteKey();
    }
    else {
        deselectTiles();
    }
}

function handleKeyPress(e) {
    if (!ui_interaction_enabled) return;

    if (e.key === "Enter") {
        submitGuess();
    }
    else if (e.key === "Backspace" || e.key === "Delete") {
        deleteKey();
    }
    else if (e.key.match(/^[a-z]$/)) {
        pressKey(e.key);
    }
}


// Util for checking if a 2d array contains an array
const arrayContains = (arrays, array) => arrays.some(a => {
    return (a.length > array.length ? a : array).every((_, i) => a[i] === array[i]);
});

function tileIsActive(x, y) {
    return arrayContains(active_tiles, [x,y]);
}

function handleTileClicked(x, y) {
    var should_select_row = !(tileIsActive(x, y) && active_is_row);

    deselectTiles();

    var t = game.state.tiles[[x, y]];
    if (t.solved) {
        console.log("Clicked solved tile");
        return;
    }

    var word = game.getWord(x, y, should_select_row);

    // Don't select 1-long words
    if (word.length <= 1) {
        should_select_row = !should_select_row;
        word = game.getWord(x, y, should_select_row);
    }

    selectTiles(word);

    active_is_row = should_select_row;
    active_tiles = word;

    console.log(word);
}


function deselectTiles() {
    active_tiles.map(t => {
        // Remove selection css
        entry_dom_tiles[t].classList.remove("selected");
        explanation_dom_tiles[t].classList.remove("selected");

        // Remove any letters, but only from unsolved tiles
        if (game.state.tiles[t].solved) return;

        current_guess = {};

        delete explanation_dom_tiles[t].dataset.state;
        var entry_tile = entry_dom_tiles[t];
        delete entry_tile.dataset.state;

        // TODO: Fade out
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

function pressKey(key) {
    if (active_tiles.length == 0) return;

    // Find the first unsolved tile we don't have a guess for...
    var unsolved_tile_pos = null;
    for (var i = 0; i < active_tiles.length; i++) {

        if (!game.state.tiles[active_tiles[i]].solved
            && !(active_tiles[i] in current_guess))
        {
            unsolved_tile_pos = active_tiles[i];
            break;
        }
    }

    if (!unsolved_tile_pos) {
        console.log("No unsolved tiles");
        return;
    }

    var tile = entry_dom_tiles[unsolved_tile_pos];
    tile.textContent = key;
    current_guess[unsolved_tile_pos] = key;
}

function deleteKey() {
    // Remove last from current_guess...
    if (Object.keys(current_guess).length == 0) {
        return;
    }

    var last_letter_guess = null;
    // Go through all keys, overwriting prev
    for (var i = 0; i < active_tiles.length; i++) {
        if (active_tiles[i] in current_guess)
            last_letter_guess = active_tiles[i];
    }

    // Remove from current guess
    delete current_guess[last_letter_guess];

    // Clear that tile..
    var tile = entry_dom_tiles[last_letter_guess];
    tile.textContent = "";
}

function submitGuess() {
    // All letters entered...

    // Reconstruct guess from changed & unchanged letters...
    let guess = [];
    for (let i = 0; i < active_tiles.length; i++) {
        let ts = game.state.tiles[active_tiles[i]];
        if (ts.solved) {
            guess.push({
                'letter': ts.solution,
                'position': active_tiles[i],
            })
        }
        else {
            if (active_tiles[i] in current_guess) {
                guess.push({
                    'letter': current_guess[active_tiles[i]],
                    'position': active_tiles[i],
                });
            }
            else {
                // Incomplete word!
                showAlert("You can only guess complete words");
                shakeTiles(active_tiles.map(tile_coord => entry_dom_tiles[tile_coord]));
                return;
            }
        }
    }

    ui_interaction_enabled = false;

    console.log(guess);
    let result = game.makeGuess(guess);

    if (!result.success) {
        // Guess failed - explain why
        showAlert(result.reason);
        shakeTiles(active_tiles.map(tile_coord => entry_dom_tiles[tile_coord]));
        ui_interaction_enabled = true;
        return;
    }

    // Otherwise guess succeeded! Update changed tiles...
    result.tiles_changed.forEach((new_state, ix) => {
        updateUI(new_state.position, new_state.letter, new_state.state, ix);
    });

    current_guess = {};

    var time_until_animation_finishes = (result.tiles_changed.length + 1) * FLIP_ANIMATION_DURATION * 0.5;
    setTimeout(() => {
        if (game.state.gameplay_state == GAMEPLAY_STATE_WON) {
            win();
        }
        else if (game.state.gameplay_state == GAMEPLAY_STATE_LOST) {
            loose();
        }
        else {
            ui_interaction_enabled = true;
        }
    }, time_until_animation_finishes);
}

// NOTE: Could modify this to allow deserialization of game state.
function updateUI(tile_coord, letter_guessed, state, letter_ix_in_word) {
    var entryTile = entry_dom_tiles[tile_coord];

    var infoTile = explanation_dom_tiles[tile_coord];
    var guessSquares = infoTile.querySelectorAll('[data-state="empty"]');
    console.log(guessSquares);

    guessSquares[0].textContent = letter_guessed;
    // var state;
    // if (is_solved) {
    //     state = "correct";
    // }
    // else if (is_elsewhere) {
    //     state = "wrong-location";
    // }
    // else {
    //     state = "wrong";
    // }

    flipTile(entryTile, letter_ix_in_word, state);
    flipTile(guessSquares[0], letter_ix_in_word, state);
}

function flipTile(tile, letter_ix_in_word, state) {
    setTimeout(() => {
        tile.classList.add("flip");
    }, (letter_ix_in_word * FLIP_ANIMATION_DURATION) / 2)

    tile.addEventListener(
        "transitionend",
        () => {
            tile.classList.remove("flip")
            tile.dataset.state = state;
        },
        { once: true }
    )
}

function showAlert(message, duration=1000) {
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

// function checkWinLose() {
//     if (!unsolved_tile) {
//         win();
//     }
//     else if (tile_with_no_guesses) {
//         loose();
//     }
// }

function win() {
    // Ya win!
    // showAlert("You Win", 5000);
    ui_interaction_enabled = false;

    jsConfetti.addConfetti({
        emojis: ['🟩'],
        confettiNumber: 10,
    });
    jsConfetti.addConfetti({
        emojis: ['🟨'],
        confettiNumber: 5,
    });
    jsConfetti.addConfetti();

    danceTiles(Object.values(explanation_dom_tiles));
    danceTiles(Object.values(entry_dom_tiles));

    showResultsModal(true, 1200);
}

function loose() {
    // Ya loose :c
    ui_interaction_enabled = false;
    showResultsModal(false, 200);
}

function showResultsModal(delay) {
    var title = document.getElementById("resultsModalTitle");
    var txt = document.getElementById("resultsModalText");
    var emojis = document.getElementById("resultsModalEmojis");
    // var copy_button = document.getElementById("resultsModelShareButton");
    let modal = new bootstrap.Modal(document.getElementById('resultsModal'), {});

    var did_win = (game.state.gameplay_state == GAMEPLAY_STATE_WON);
    title.textContent = did_win ? "You WIN!" : "So close...";

    var mainText = "Crosswordle #" + puzzle_number + ": ";
    if (did_win) {
        txt.textContent = mainText + game.state.num_guesses + " guesses";
    }
    else {
        txt.textContent = mainText + game.state.num_guesses + "/?? guesses";
    }

    emojis.innerHTML = game.getBoardBreakdown().join("<br>");

    // copy_button.setAttribute("data-clipboard-text", getShareText());

    setTimeout(() => {
        modal.show();
    }, delay);
    // myModal.show();
}

function share() {
    console.log("share");
    let title = "Crosswordle #" + puzzle_number + ": " + game.state.num_guesses;
    if (game.state.gameplay_state == GAMEPLAY_STATE_WON) {
        title += " guesses";
    }
    else {
        title += "/?? guesses";
    }
    let text = game.getBoardBreakdown().join("\n");
    let url = "imois.in/games/crosswordle";

    const share_button = document.getElementById("resultsModelShareButton");

    let resultCallback = (msg => {
        var popover = new bootstrap.Popover(share_button, {
            content: msg,
            placement: "top",
            // trigger: "focus",
        });
        popover.show();
    });

    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url,
        })
                 .then(() => resultCallback('Shared!'))
                 .catch((error) => resultCallback('Sharing failed'));
    }
    else {
        // Try copy to clipboard
        var share_text = title + "\n" + text + "\n" + url;
        navigator.clipboard.writeText(share_text).then(function() {
            resultCallback('Copied!');
        }, function() {
            resultCallback('Copy failed');
        });
    }
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
        }, (index * DANCE_ANIMATION_DURATION) / 5) /* % DANCE_ANIMATION_DURATION */
    })
}
