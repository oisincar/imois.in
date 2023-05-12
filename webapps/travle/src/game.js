'use strict';

// Load and set up SVG for rendering map
var width, height;

const map_svg = d3.select("#d3-map");

// map_svg.call(responsivefy);

const jsConfetti = new JSConfetti();


// Country ID -> GEOJSON data for that country (feature)
var COUNTRY_ID_DATA_LOOKUP = {};
// Convert from country name to ID. NOTE: All lower case keys
var COUNTRY_NAME_ID_LOOKUP = {};
// List of official 'human' names for countries. Matches .NAME field in geojson data.
var COUNTRY_NAMES = [];

var COUNTRY_ADJACENCY = null;

const alertContainer = document.querySelector("[data-alert-container]")

const GAMEPLAY_STATE_ONGOING = "ongoing";
const GAMEPLAY_STATE_LOST = "lost";
const GAMEPLAY_STATE_WON = "won";

const EMOJI_PERFECT = "✅";
const EMOJI_GOOD = "🟧";
const EMOJI_POOR = "🟥";
const EMOJI_IMPOSSIBLE = "⬛";

class GameState {
    puzzle_ix = 0;
    start_country = null;
    target_country = null;
    shortest_solution = 0;
    highlighted_country = null;

    hints_data = [];

    // Past guesses stored as IDs
    past_guess_ids = [];
    // Successful guesses (also IDs)
    successful_guesses = [];

    guess_ratings = [];

    game_progress = GAMEPLAY_STATE_ONGOING;

    get visible_countries() {
        return [this.start_country, this.target_country].concat(this.successful_guesses);
    }

    get last_guess() {
        var l = this.past_guess_ids.length;
        if (l == 0) return null;
        return this.past_guess_ids[l-1];
    }

    get last_rating() {
        var l = this.guess_ratings.length;
        if (l == 0) return null;
        return this.guess_ratings[l-1];
    }

    get num_hints() {
        return this.hints_data.length;
    }
    get show_initials() {
        return (this.num_hints == 3);
    }

    get hint_outline_countries() {
        // Get all countries outlines
        var num_hints = this.num_hints;
        var visible_outlines = [];
        if (num_hints >= 2 || this.game_progress != GAMEPLAY_STATE_ONGOING) {
            visible_outlines = Object.keys(COUNTRY_ID_DATA_LOOKUP);
        }
        else if (num_hints == 1) {
            visible_outlines.push(this.hints_data[0].reveal_country);
        }

        var visible = new Set(this.visible_countries);
        visible_outlines = visible_outlines.filter(c => !visible.has(c));

        return visible_outlines;
    }

    get possible_guesses() {
        var num_guesses = this.shortest_solution - 1;

        if (num_guesses <= 3) {
            return num_guesses + 4;
        }
        else if (num_guesses <= 6) {
            return num_guesses + 5;
        }
        else if (num_guesses <= 9) {
            return num_guesses + 6;
        }
        else if (num_guesses <= 12) {
            return num_guesses + 7;
        }
        else {
            return num_guesses + 8;
        }
    }

    get has_guesses_remaining() {
        return this.past_guess_ids.length < this.possible_guesses;
    }

    get share_text() {
        var score_txt;
        if (this.game_progress == GAMEPLAY_STATE_WON) {
            score_txt = `(${this.past_guess_ids.length}/${this.possible_guesses}) (${this.num_hints} hints)`;
        }
        else {
            var steps_left = this.minimum_guesses_to_solve();
            score_txt = `(?/${this.possible_guesses}) (${steps_left} away)`;
        }

        var baseText = `#travle #${this.puzzle_ix} ${score_txt}\n`;
        baseText += this.guess_ratings.join("") + "\n";
        baseText += "https://imois.in/games/travle";

        return baseText;
    }

    // get share_text_old() {
    //     var baseText = `travle #${this.puzzle_ix}: `;

    //     var start_c = COUNTRY_ID_DATA_LOOKUP[this.start_country].properties.NAME_EN;
    //     var end_c = COUNTRY_ID_DATA_LOOKUP[this.target_country].properties.NAME_EN;
    //     var num_guesses = this.past_guess_ids.length;

    //     if (this.game_progress == GAMEPLAY_STATE_LOST) {
    //         var steps_left = this.minimum_guesses_to_solve();
    //         var steps_txt = steps_left + " step" + (steps_left == 1 ? "" : "s")
    //         baseText += `From ${start_c} I made it to ${steps_txt} from ${end_c}\n`;
    //     }
    //     else {
    //         baseText += `I made it from ${start_c} to ${end_c} in ${this.past_guess_ids.length}/${this.possible_guesses} steps.\n`;
    //     }
    //     baseText += this.guess_ratings.join("") + "\n";
    //     baseText += "imois.in/games/travle";
    //     return baseText;
    // }

    constructor(puzzle_ix, start, target, shortest_solution) {
        this.puzzle_ix = puzzle_ix;
        this.start_country = start;
        this.target_country = target;
        this.shortest_solution = shortest_solution;

        this.highlighted_country = this.start_country;
    }

    make_guess(country_name) {
        // Sanity check
        if (this.game_progress !== GAMEPLAY_STATE_ONGOING) {
            showAlert("GAME OVER");
            return false;
        }

        // Check how far from a solution we are now...
        var distToSol = this.minimum_guesses_to_solve();

        var country_lower = country_name.toLowerCase();
        if (country_lower in COUNTRY_NAME_ID_LOOKUP) {
            var id = COUNTRY_NAME_ID_LOOKUP[country_lower];
            if (!this.successful_guesses.includes(id)
                && this.start_country != id && this.target_country != id)
            {
                this.past_guess_ids.push(id);
                this.successful_guesses.push(id);
                this.highlighted_country = id;
            }
            else {
                showAlert("Country already guessed: " + country_name);
                return false;
            }
        }
        else {
            showAlert("Unknown country name: " + country_name);
            return false;
        }

        // Rate this guess... Has this us get closer to a solution?
        var guessRating;
        var improvement = this.minimum_guesses_to_solve() - distToSol;
        if (improvement == -1) {
            guessRating = EMOJI_PERFECT;
        }
        else {
            if (improvement != 0) {
                console.log("ERROR: Guess made us worse? " + distToSol + " " + improvement);
            }
            // Check distance to go through the latest guess.
            var dist = this.minimum_guesses_to_join(this.start_country, this.highlighted_country)
                     + this.minimum_guesses_to_join(this.highlighted_country, this.target_country);

            console.log("Prev dist", distToSol);
            console.log("Distance via last guess is: ", dist);
            if (isNaN(dist)) {
                // No path through new guess... What'cha doin!
                guessRating = EMOJI_IMPOSSIBLE;
            }
            else if (dist <= distToSol + 1) {
                // Path through this new guess isn't more than 1 farther than what we had before.
                guessRating = EMOJI_GOOD;
            }
            else {
                // Path is further
                guessRating = EMOJI_POOR;
            }
        }
        this.guess_ratings.push(guessRating);

        // Check if the game is over now :(
        if (this.check_if_solved()) {
            this.game_progress = GAMEPLAY_STATE_WON;
        }
        else if (!this.has_guesses_remaining) {
            this.game_progress = GAMEPLAY_STATE_LOST;
        }

        return true;
    }

    get is_valid() {
        var found_all = true;
        for (const c of this.visible_countries) {
            if (!(c in COUNTRY_ID_DATA_LOOKUP)) {
                console.log("Could not find country ID: " + c);
                found_all = false;
            }
        }
        return found_all;
    }

    get_adjacent_countries(id) {
        if (id in COUNTRY_ADJACENCY) {
            return COUNTRY_ADJACENCY[id];
        }
        return [];
    }

    check_if_solved() {
        var perimeter = [this.start_country];

        var visited = new Set();
        var guessed_countries = new Set(this.visible_countries);

        while (perimeter.length > 0) {
            var elem = perimeter.pop();
            if (visited.has(elem)) {
                continue;
            }

            if (elem === this.target_country) {
                return true;
            }

            visited.add(elem);

            // Add adjacent, guessed countries to the periphery.
            for (const neighbor of this.get_adjacent_countries(elem)) {
                if (guessed_countries.has(neighbor)) {
                    perimeter.push(neighbor);
                }
            }
        }

        console.log("Could not find a path from start to end, but visited:", visited);

        // We didn't find any path between start and end...
        return false;
    }

    reveal_next_hint() {
        // Reveal next country border
        // Reveal all country borders
        // Reveal country first letters

        if (this.game_progress != GAMEPLAY_STATE_ONGOING) {
            console.log("Game is over");
            return;
        }

        var num_hints = this.hints_data.length;

        if (num_hints == 0) {
            // Find a country to reveal.
            var path = this.dijkstras(this.start_country, this.target_country, true);
            var revealed_country = path.guessesNeeded[0];
            this.hints_data.push({"reveal_country": revealed_country});
        }
        else if (num_hints == 1) {
            this.hints_data.push({"reveal_all": null});
        }
        else if (num_hints == 2) {
            this.hints_data.push({"reveal_country_initials": null});
        }
        else {
            console.log("Already revealed all hints");
        }
    }

    // From the current game state, how many guesses required to solve the board
    minimum_guesses_to_solve() {
        return this.minimum_guesses_to_join(this.start_country, this.target_country);
    }

    // From the current game state, how many guesses required to join these two countries.
    minimum_guesses_to_join(start_country, target_country) {
        var perimiter = [start_country];
        var visited = new Set();
        var guessedCountries = new Set(this.visible_countries);

        // Each loop of this corresponds to one extra guess.
        // Floodfill from the start country, but when we hit
        // a country we've already guessed, immediately add those neighbours
        // as 'reachable' without an extra guess too.
        var numGuesses = 0;
        while (perimiter.length > 0) {
            var newPerimiter = [];

            while (perimiter.length > 0) {
                var country = perimiter.pop();
                if (visited.has(country)) continue;
                visited.add(country);

                if (country === target_country) {
                    if (!guessedCountries.has(country)) {
                        numGuesses += 1;
                    }
                    return numGuesses;
                }

                // If this country has already been guessed, then we can access
                // neighbors for free.
                // NOTE: There are some cases where a country will be pushed to both
                // perimiter and newPerimiter (multiple times). Since we only visit
                // a node the first time it occurs in any list, this is fine.
                if (guessedCountries.has(country)) {
                    for (const neighbor of this.get_adjacent_countries(country)) {
                        perimiter.push(neighbor);
                    }
                }
                else {
                    for (const neighbor of this.get_adjacent_countries(country)) {
                        newPerimiter.push(neighbor);
                    }
                }
            }
            numGuesses += 1;
            perimiter = newPerimiter;
        }
        // No solution found!
        return NaN;
    }

    dijkstras(start_country, target_country, use_guesses) {
        // Map country id to distance from the start.
        var dist = {};
        // same, to prev country
        var prev = {};
        var visited = new Set();

        var queue = [start_country];

        // Countries we consider that we've already guessed.
        var givenCountries = use_guesses ? new Set(this.visible_countries) : new Set();

        while (queue.length > 0) {
            var country = queue.shift();
            if (visited.has(country)) continue;
            visited.add(country);

            if (country === target_country) {
                break;
            }

            // If this country has already been guessed, then we can access
            // neighbors for free.
            for (const n of this.get_adjacent_countries(country)) {
                if (!visited.has(n)) {

                    if (prev[n] == null) {
                        prev[n] = country;
                    }

                    // Ghetto-ist priority queue... Just prepend when there's a cost of 0.
                    // This is (surprisingly) suffecient to guarante we hit all nodes in the correct order.
                    // See: Equivariant property of this loop is that all nodes in the queue are either the
                    // same distance as the currently explored node, or one further.
                    if (givenCountries.has(n)) {
                        queue.unshift(n);
                    }
                    else {
                        queue.push(n);
                    }

                }
            }
        }

        // Reconstruct!
        var n = target_country;
        var path = [];
        while (n != null) {
            path.push(n);
            n = prev[n];
        }
        path = path.reverse();

        if (path[0] !== start_country) {
            return {
                "path": null,
                "guessesNeeded": null,
                "cost": -1,
            }
        }

        // Get path cost
        var cost = 0;
        var guessesNeeded = [];
        for (const c of path) {
            if (!givenCountries.has(c)) {
                cost += 1;
                guessesNeeded.push(c);
            }
        }

        return {
            "path": path,
            "guessesNeeded": guessesNeeded,
            "cost": cost,
        };
    }
}

class PastGuessManager {

    constructor(parentElement, numSections) {
        this.parentElement = parentElement;
        this.guessIx = 0;

        // for (var i = 0; i < numSections; i++) {
        //     var a = document.createElement('div');
        //     a.classList.add('countries-guess-empty');
        //     this.parentElement.appendChild(a);

        //     this.guessDomElements.push(a);
        // }
    }

    addGuess(countryId, guessRatingEmoji) {
        var elem = document.createElement('button');
        elem.classList.add('past-guess');
        this.parentElement.appendChild(elem);

        let countryName = COUNTRY_ID_DATA_LOOKUP[countryId].properties.NAME_EN;

        // Find title text for guessRating
        let guessTitleText;
        if (guessRatingEmoji === EMOJI_PERFECT) {
            guessTitleText = "Perfect guess. This country is on the shortest route.";
        }
        else if (guessRatingEmoji === EMOJI_GOOD) {
            guessTitleText = "Good guess. Not the shortest route, but it's not far off.";
        }
        else if (guessRatingEmoji === EMOJI_POOR) {
            guessTitleText = "Bit of a detour from " + countryName;
        }
        else if (guessRatingEmoji === EMOJI_IMPOSSIBLE) {
            guessTitleText = "Big detour from " + countryName;
        }

        this.guessIx++;

        elem.innerHTML =
            (`<span class="align-middle ix">${this.guessIx}.</span>`
             + `<span class="align-middle country">${countryName}</span>`
             + `<span class="align-middle emoji" title="${guessTitleText}">${guessRatingEmoji}</span>`);

        elem.addEventListener('click', (e) => {
            var now_hidden = map.toggle_visibility(countryId);

            if (now_hidden) {
                elem.classList.add('past-guess-hidden');
            }
            else {
                elem.classList.remove('past-guess-hidden');
            }
        });
    }
}


let has_warned_about_cookies = false;
function loadCountryData(geojson, adjacency) {
    for (const country of geojson.features) {
        // This seems to be unique for all countries/territories
        var id = country.properties.ID;
        // Store ID in a handy place.
        country.id = id;

        COUNTRY_ID_DATA_LOOKUP[id] = country;
        COUNTRY_NAME_ID_LOOKUP[country.properties.NAME_EN.toLowerCase()] = id;
        COUNTRY_NAMES.push(country.properties.NAME_EN);
    }

    COUNTRY_NAMES.sort();

    COUNTRY_ADJACENCY = adjacency;
}

var SEARCH_BAR = null;
var GUESS_BTN = null;
function createSearchbar() {
    var field = document.getElementById("countries-input");

    var data = COUNTRY_NAMES.map((name, ix) => {
        return {"label": name, "value": ix }
    });

    SEARCH_BAR = new Autocomplete(field, {
        data: data,
        threshold: 1,
        maximumItems: -1,
        onSelectItem: ({label, value}) => {
            field.focus();
        },
        onEnterSelection: () => {
            submitCurrentGuess();
        }
    });

    // Also set up the button
    GUESS_BTN = document.getElementById("btn-guess");
    GUESS_BTN.addEventListener("click", function () {
        submitCurrentGuess();
    });
}

var HINT_BUTTONS = null;
var HINTS_TEXT = null;
function initializeHintsUI() {
    HINTS_TEXT = document.getElementById("hints-text");

    HINT_BUTTONS = [
        document.getElementById("hint-btn-1"),
        document.getElementById("hint-btn-2"),
        document.getElementById("hint-btn-3")];

    HINT_BUTTONS.forEach(btn => {
        btn.addEventListener("click", revealNextHint);
    });

    applyHints();
    updateHintsUI();
}

function updateHintsUI() {
    HINT_BUTTONS.forEach(btn => {
        btn.classList.add("disabled");
    });

    var num_hints = GAME_STATE.num_hints;

    // Only enable buttons while game is ongoing
    if (GAME_STATE.game_progress === GAMEPLAY_STATE_ONGOING
        && num_hints < HINT_BUTTONS.length)
    {
        HINT_BUTTONS[num_hints].classList.remove("disabled");
    }

    HINTS_TEXT.textContent = `Get a hint (${num_hints}/3):`;
}

function revealNextHint() {
    if (GAME_STATE.game_progress !== GAMEPLAY_STATE_ONGOING) {
        return;
    }

    GAME_STATE.reveal_next_hint();
    updateHintsUI();
    saveGameState();

    // Update map
    GAME_STATE.hint_outline_countries.forEach(c_id => {
        map.add_country_to_map(c_id, true);
    });

    if (GAME_STATE.show_initials) {
        map.outline_text = "initials";
    }
}

function applyHints() {
    // Make sure the map view shows all hints!

    // TODO: Filter for non-visible countries?
    // .filter(c_id => (c_id));
}

function updateGuessButton() {
    var current_guess_ix = GAME_STATE.past_guess_ids.length + 1;
    var max_guesses = GAME_STATE.possible_guesses;

    var should_disable = false;

    if (current_guess_ix > max_guesses) {
        // Game lost. Just show N/N
        current_guess_ix = max_guesses;

        should_disable = true;
    }
    else if (GAME_STATE.game_progress !== GAMEPLAY_STATE_ONGOING) {
        // Game won(?): Show the last guess made.
        current_guess_ix -= 1;

        should_disable = true;
    }

    if (should_disable) {
        GUESS_BTN.classList.add("disabled");
    }

    GUESS_BTN.textContent = `Guess (${current_guess_ix}/${max_guesses})`;
}

function submitCurrentGuess() {
    var guess = SEARCH_BAR.value.trim();
    console.log(`>${guess}<`);

    if (GAME_STATE.make_guess(guess)) {
        console.log("Successfully guessed!")

        var id = GAME_STATE.last_guess;
        map.add_country_to_map(id, false);
        map.recenter_map();

        SEARCH_BAR.clear();

        updateGuessButton();

        var country_data = COUNTRY_ID_DATA_LOOKUP[id];
        guessManager.addGuess(id, GAME_STATE.last_rating);

        saveGameState();

        if (GAME_STATE.game_progress !== GAMEPLAY_STATE_ONGOING) {
            saveWinLoss(GAME_STATE.puzzle_ix,
                        GAME_STATE.past_guess_ids.length,
                        GAME_STATE.game_progress === GAMEPLAY_STATE_WON);

            maybeShowEndGameUI();
        }
    }
}

// An array of all flags.
// Each flag is 4 unicode characters, so split string into substrings of this length
const allFlags = (
    "🇩🇿🇦🇩🇦🇫🇦🇬🇦🇮🇦🇱🇦🇲🇦🇴🇦🇷🇦🇸🇦🇹🇦🇺🇦🇼🇦🇽🇦🇿🇧🇦🇧🇧🇧🇩🇧🇪🇧🇫🇧🇬"
        + "🇧🇭🇧🇮🇧🇯🇧🇲🇧🇳🇧🇴🇧🇷🇧🇸🇧🇹🇧🇼🇧🇾🇧🇿🇨🇦🇨🇨🇨🇩🇨🇫🇨🇬🇨🇭🇨🇮🇨🇰🇨🇱"
        + "🇨🇲🇨🇳🇨🇷🇨🇴🇨🇺🇨🇻🇨🇼🇨🇽🇨🇾🇨🇿🇩🇪🇩🇯🇩🇰🇩🇲🇩🇴🇪🇨🇸🇻🇪🇪🇪🇬🇪🇷🇪🇸"
        + "🇪🇹🇪🇺🇫🇮🇫🇯🇫🇲🇫🇴🇫🇷🇬🇦🇬🇧🇬🇩🇬🇪🇬🇫🇬🇬🇬🇭🇬🇮🇬🇱🇬🇲🇬🇳🇬🇵🇬🇶🇬🇷"
        + "🇬🇹🇬🇺🇬🇼🇬🇾🇭🇰🇭🇳🇭🇷🇭🇹🇭🇺🇮🇩🇮🇪🇮🇱🇮🇲🇮🇳🇮🇴🇮🇶🇮🇷🇮🇸🇮🇹🇯🇪🇯🇲"
        + "🇯🇴🇯🇵🇰🇪🇰🇬🇰🇭🇰🇮🇰🇲🇰🇳🇰🇵🇰🇷🇰🇼🇰🇾🇰🇿🇱🇦🇱🇧🇱🇨🇱🇮🇱🇰🇱🇷🇱🇸🇱🇹"
        + "🇱🇺🇱🇻🇱🇾🇲🇦🇲🇨🇲🇩🇲🇪🇲🇬🇲🇭🇲🇰🇲🇱🇲🇲🇲🇳🇲🇴🇲🇵🇲🇶🇲🇷🇲🇸🇲🇹🇲🇺🇲🇻"
        + "🇲🇼🇲🇽🇲🇾🇲🇿🇳🇦🇳🇨🇳🇪🇳🇫🇳🇬🇳🇮🇳🇱🇳🇴🇳🇵🇳🇷🇳🇺🇳🇿🇴🇲🇵🇦🇵🇪🇵🇫🇵🇬"
        + "🇵🇭🇵🇰🇵🇱🇵🇲🇵🇳🇵🇷🇵🇸🇵🇹🇵🇼🇵🇾🇶🇦🇷🇪🇷🇴🇷🇺🇷🇼🇼🇸🇸🇦🇸🇧🇷🇸🇸🇨🇸🇩"
        + "🇸🇪🇸🇬🇸🇭🇻🇨🇸🇮🇸🇰🇸🇱🇸🇲🇸🇳🇸🇴🇸🇷🇸🇸🇸🇹🇸🇽🇸🇾🇸🇿🇹🇨🇹🇩🇹🇬🇹🇭🇹🇯"
        + "🇹🇰🇹🇱🇹🇲🇹🇳🇹🇴🇹🇷🇹🇹🇹🇻🇹🇼🇹🇿🇺🇦🇺🇬🇦🇪🇺🇳🇺🇸🇺🇾🇺🇿🇻🇦🇻🇪🇻🇬🇻🇮"
        + "🇻🇳🇻🇺🇼🇫🇽🇰🇾🇪🇾🇹🇿🇦🇿🇲🇿🇼")
      .match(/.{1,4}/g) // regex splitting magic


function maybeShowEndGameUI() {
    if (GAME_STATE.game_progress === GAMEPLAY_STATE_WON) {
        // TODO: If game over, change to a 'dead' state?
        win();
    }
    else if (GAME_STATE.game_progress === GAMEPLAY_STATE_LOST) {
        // TODO: If game over, change to a 'dead' state?
        lose();
    }
}

function win() {
    jsConfetti.addConfetti({
        emojis: allFlags,
        confettiNumber: 40,
    });

    // Show all countries
    GAME_STATE.hint_outline_countries.forEach(c_id => {
        map.add_country_to_map(c_id, true);
    });
    map.outline_text = "full";

    showAlert("GAME OVER!");

    jsConfetti.addConfetti();

    showResultsModal(2500);
}

function lose() {
    showAlert("0 guesses remaining... :c");

    // Show all countries
    GAME_STATE.hint_outline_countries.forEach(c_id => {
        map.add_country_to_map(c_id, true);
    });
    map.outline_text = "full";

    showResultsModal(200);
}

function showResultsModal(delay) {
    var title = document.getElementById("resultsModalTitle");

    // Stats display
    let past_games_str = localStorage.getItem('travle-past-games');
    if (past_games_str) {
        let past_games = JSON.parse(past_games_str);

        document.getElementById("resultPlayed").textContent = past_games.games.length;
        document.getElementById("resultWinPerc").textContent = Math.round(past_games.win_perc);
        document.getElementById("resultStreakCurrent").textContent = past_games.current_streak;
        document.getElementById("resultStreakMax").textContent = past_games.longest_streak;
    }

    // Game results
    var txt = document.getElementById("resultsModalText");
    var copy_button = document.getElementById("resultsModelCopyButton");
    var share_button = document.getElementById("resultsModelShareButton");
    let modal = new bootstrap.Modal(document.getElementById('resultsModal'), {});

    title.textContent = "travle #" + GAME_STATE.puzzle_ix;

    // Game hasn't finished
    if (GAME_STATE.game_progress === GAMEPLAY_STATE_ONGOING) {
        txt.textContent = "";

        // Hide share buttons
        copy_button.classList.add('invisible');
        share_button.classList.add('invisible');
    }
    else {
        var did_win = (GAME_STATE.game_progress === GAMEPLAY_STATE_WON);

        var start_c = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.start_country].properties.NAME_EN;
        var end_c = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.target_country].properties.NAME_EN;

        let resultsHTML;

        let shouldShowOptimal = true;

        let toHumanReadable = (c => COUNTRY_ID_DATA_LOOKUP[c].properties.NAME_EN);

        if (did_win) {
            var num_steps = GAME_STATE.past_guess_ids.length;
            var best_steps = GAME_STATE.shortest_solution - 1;

            resultsHTML = `Success! You got from ${start_c} to ${end_c} in <b>${num_steps} guesses</b>.<br>`
                + `The shortest solution was <b>${best_steps} guesses</b>.<br>`

            if (num_steps == best_steps) {
                shouldShowOptimal = false;
            }
        }
        else {
            var steps_left = GAME_STATE.minimum_guesses_to_solve();
            var steps_txt = steps_left + " step" + (steps_left == 1 ? "" : "s")

            var sol = GAME_STATE.dijkstras(GAME_STATE.start_country, GAME_STATE.target_country, true);
            var missing_countries = sol.guessesNeeded.map(toHumanReadable).join(", ");
            var country_txt = sol.guessesNeeded.length == 1 ? "country" : "countries";
            resultsHTML = `So close. You were just <b>${steps_txt}</b> from ${end_c}.<br>`
                + `Missing ${country_txt}🔎: ${missing_countries}.<br><br>`
                + `The shortest solution was <b>${GAME_STATE.shortest_solution-1} guesses</b>.<br>`;
        }

        if (shouldShowOptimal) {
            var best_sol = GAME_STATE.dijkstras(GAME_STATE.start_country, GAME_STATE.target_country, false);
            resultsHTML += `${best_sol.path.map(toHumanReadable).join(" ➡️ ")}.<br>`;
        }

        // Emojis
        resultsHTML += "<br>Guess breakdown:";
        let emojisText = GAME_STATE.guess_ratings.join("");
        resultsHTML += `<p class="results-emoji-breakdown" id="resultsModalEmojis">${emojisText}</p>`;

        // Maps link
        let mapsLink = generateGoogleMapsLink(
            GAME_STATE.start_country,
            GAME_STATE.target_country);
        resultsHTML += `<a href=${mapsLink}>👀 ${start_c} to ${end_c} on Google Maps</a><br>`;


        // Countdown until next travle!
        var nextIx = GAME_STATE.puzzle_ix + 1;
        resultsHTML += `<br><div>travle #${nextIx} available in <b id='clock-time'></b>.</div>`;

        txt.innerHTML = resultsHTML;

        runCountdownTimer();

        // Show share buttons
        copy_button.classList.remove('invisible');
        if (navigator.share)
            share_button.classList.remove('invisible');
    }

    // Share

    setTimeout(() => {
        modal.show();
    }, delay);
}

function getTimeStrUntilTomorrow() {
    var now = new Date();

    var midnight = new Date(now)
    midnight.setDate(now.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);

    var secsTilMidnight = (midnight - now) / 1000;

    let showN = (n) => {
        return n.toString().padStart(2, '0');
    }

    let hours = Math.floor(secsTilMidnight / (60 * 60));
    let minutes = Math.floor((secsTilMidnight / 60) % 60);
    let seconds = Math.floor(secsTilMidnight % 60);

    return `${showN(hours)}:${showN(minutes)}:${showN(seconds)}`;
}

// If the countdown is already running, stop it.
// Then update the countdown.
let countdownInterval = null;
function runCountdownTimer() {
    if (countdownInterval != null) {
        console.log("Clearing prev");
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Update the count down every 1 second
    let f = function() {
        var elem = document.getElementById("clock-time");
        if (elem != null) {
            var timeStr = getTimeStrUntilTomorrow();
            elem.innerHTML = timeStr;
        }
        else {
            console.log("Clearing");
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    };
    // Call immediately to get an initial result.
    f();

    countdownInterval = setInterval(f, 1000);
}

function generateGoogleMapsLink(startId, endId) {
    let start = COUNTRY_ID_DATA_LOOKUP[startId].properties.NAME_EN;
    start = encodeURIComponent(start);
    let end = COUNTRY_ID_DATA_LOOKUP[endId].properties.NAME_EN;
    end = encodeURIComponent(end);

    return `https://www.google.com/maps/dir/${start}/${end}/`;
}

var map = null;

var guessManager;
function loadGuesses() {
    var elem = document.getElementById("past-guesses");
    guessManager = new PastGuessManager(elem, GAME_STATE.possible_guesses);
    for (var i = 0; i < GAME_STATE.past_guess_ids.length; i++) {
        var countryId = GAME_STATE.past_guess_ids[i];
        // var countryName = COUNTRY_ID_DATA_LOOKUP[countryId].properties.NAME_EN;
        var guessRatingEmoji = GAME_STATE.guess_ratings[i];
        guessManager.addGuess(countryId, guessRatingEmoji);
    }
}

function showAlert(message, duration=1000) {
    const alert = document.createElement("div")
    alert.textContent = message
    alert.classList.add("alert")
    alertContainer.prepend(alert)
    if (duration == null) return

    console.log("Showing alert:" + message);

    setTimeout(() => {
        alert.classList.add("hide")
        alert.addEventListener("transitionend", () => {
            alert.remove()
        })
    }, duration)
}

// function getRandomInt(max) {
//   return Math.floor(Math.random() * max);
// }

var GAME_STATE = null;

// Either load from web storage, or create gamestate based on cached routes.
function loadTopText() {
    var start = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.start_country].properties.NAME_EN;
    var target = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.target_country].properties.NAME_EN;

    var title = document.getElementById("title-text");

    title.innerHTML = `Today I'd like to go from <b>${start}</b> to <b>${target}</b>`;

    fitty("#title-text");
}

// -------- Save/ Load game state ---------
function getPuzzleNumber() {
    var now = Date.now();
    // Travle released 15th Dec 2022!
    return Math.floor(daysBetween(new Date(2022, 11, 15), now)) + 1;
}

function treatAsUTC(date) {
    var result = new Date(date);
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

function daysBetween(startDate, endDate) {
    var millisecondsPerDay = 24 * 60 * 60 * 1000;
    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

// Should probably do some proper testing... But this'll be fine for now...
// function debugSanityCheckPathfinding(routes) {
//     for (const r of routes) {
//         var path1 = GAME_STATE.dijkstras(r.start, r.target, false);
//         if (path1.cost != r.dist + 1) {
//             console.log("ERROR computing distance!");
//         }
//     }
// }

function loadGameState(routes) {
    // TODO: Choose based on today's date...
    var ix = getPuzzleNumber();
    console.log("Playing travle #", ix);
    console.log(routes);

    // var ix = 314; //Portugal <-> Austria
    // var ix = getRandomInt(routes.length);

    let prev_gamestate_str = localStorage.getItem('travle-game-state');
    console.log("last state:" + prev_gamestate_str);

    var route = routes[ix-1];
    GAME_STATE = new GameState(ix, route.start, route.target, route.dist);

    if (prev_gamestate_str) {
        let prev_gamestate = JSON.parse(prev_gamestate_str);
        console.log(prev_gamestate_str);
        console.log(prev_gamestate);

        if (prev_gamestate.puzzle_ix == ix) {
            console.log("Found save from today, loading!");

            // Just do this a dumb way... Copy things from save into the new state
            GAME_STATE.highlighted_country = prev_gamestate.highlighted_country;
            GAME_STATE.past_guess_ids = prev_gamestate.past_guess_ids;
            GAME_STATE.successful_guesses = prev_gamestate.successful_guesses;
            GAME_STATE.guess_ratings = prev_gamestate.guess_ratings;
            GAME_STATE.game_progress = prev_gamestate.game_progress;
            var hints = prev_gamestate.hints_data;
            GAME_STATE.hints_data = hints == null ? [] : hints;
        }
    }

    // debugSanityCheckPathfinding(routes);
}

function saveGameState() {
    if (typeof COOKIES_ACCEPTED !== 'undefined' && COOKIES_ACCEPTED) {
        localStorage.setItem('travle-game-state', JSON.stringify(GAME_STATE));
    }
    else {
        warnAboutCookies();
    }
}

function saveWinLoss(game_id, guesses, did_win) {
    // Data is stored like:
    // {
    //     last_game_id: ##,
    //     current_streak: ##,
    //     longest_streak: ##,
    //     win_perc: ##,
    //     games: [{game_id: ##, num_guesses: ##, won: true/false}],
    // }

    if (typeof COOKIES_ACCEPTED === 'undefined' || !COOKIES_ACCEPTED) {
        warnAboutCookies();
        return;
    }

    let past_games_str = localStorage.getItem('travle-past-games');
    let past_games;
    if (past_games_str)
        past_games = JSON.parse(past_games_str);
    else {
        past_games = {
            'last_game_id': -1,
            'current_streak': 0,
            'longest_streak': 0,
            'win_perc': 0,
            'games': [],
        };
    }

    if (past_games.last_game_id >= game_id) {
        console.log("Already saved...");
    }
    else {
        let data = {
            "game_id": game_id,
            "guesses": guesses,
            "won": did_win,
        };
        past_games.games.push(data);

        // Update streaks...
        if (past_games.last_game_id + 1 != game_id || !did_win) {
            // Streak broken :c
            past_games.current_streak = 0;
        }

        if (did_win) {
            past_games.current_streak += 1;
            if (past_games.current_streak > past_games.longest_streak) {
                past_games.longest_streak = past_games.current_streak;
            }
        }

        past_games.last_game_id = game_id;

        // recalculate win%
        let wins = 0;
        for (var i = 0; i < past_games.games.length; i++) {
            if (past_games.games[i].won) wins += 1;
        }

        past_games.win_perc = 100 * wins/past_games.games.length;

        // Save it again!
        localStorage.setItem('travle-past-games', JSON.stringify(past_games));
        console.log("Saved: ", past_games);
    }
}

function warnAboutCookies() {
    if (!has_warned_about_cookies) {
        showAlert("This game requires cookies to save your progress & streak. If you navigate away your progress will be lost!", 10000);

        has_warned_about_cookies = true;
    }
}

var popover = null;
function setupCopyShareButton() {
    let a = document.getElementById('resultsModal');
    let copyButton = document.getElementById('resultsModelCopyButton');

    let clipboard = new ClipboardJS(copyButton, {
        container: document.getElementById('resultsModal'),
        text: function (trigger) {
            return GAME_STATE.share_text;
        },
    });

    clipboard.on('success', function (e) {
        if (popover) popover.dispose();

        popover = new bootstrap.Popover(copyButton, {
            content: "Copied!",
            placement: "top",
            trigger: "hover",
        });
        popover.show();

        // console.info('Action:', e.action);
        // console.info('Text:', e.text);
        // console.info('Trigger:', e.trigger);

        e.clearSelection();
    });

    clipboard.on('error', function (e) {
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
    });
}
setupCopyShareButton();

function share() {
    console.log("share");
    const shareButton = document.getElementById("resultsModelShareButton");

    // Show a popover on the botton for whatever happens...
    let resultCallback = (msg => {
        if (popover) popover.dispose();

        popover = new bootstrap.Popover(shareButton, {
            content: msg,
            placement: "top",
            trigger: "hover",
        });
        popover.show();
    });

    var shareText = GAME_STATE.share_text;

    var title = `travle #${GAME_STATE.puzzle_ix}`;

    if (navigator.share) {
        navigator.share({
            "title": title,
            "text": shareText,
        })
                 .then(() => resultCallback('Shared!'))
                 .catch((error) => resultCallback('Sharing failed'));
    }
    else {
        // Try copy to clipboard
        navigator.clipboard.writeText(shareText).then(function() {
            resultCallback('Copied!');
        }, function() {
            resultCallback('Copy failed');
        });
    }
}

// Show user how to play if they haven't played before!
if (!(localStorage.getItem('travle-past-games')
      || localStorage.getItem('travle-game-state'))) {
    let modal = new bootstrap.Modal(document.getElementById('explanationModal'), {});
    modal.show();
}


// TODO: Replace cookie solution with something better!
// My understanding of GDPR is cookies/local data storage is allowed when it is
// necessary to fulfil some basic expected functionality of the site.
// In this case, saving and re-loading game state is pretty expected, and is very similar
// to the example given by the regulation: Storing items in a cart.
// Storing streaks etc is a little less straight forward but I feel it should be fine...
// With this in mind... Just mark cookies as true to bypass my safety stuff...
let COOKIES_ACCEPTED = true;

// Load external data and boot
Promise.all([
    // TODO: Separate this out to speed page load.
    // Note: Can't display countries til this arrives so... Maybe not too much improvement to make here.
    d3.json("data/countries.geojson"),
    d3.json("data/country_adjacency.json"),
    d3.json("data/routes.json"),
]).then(
    function(data) {
        var geojson = data[0];
        var adjacency = data[1];
        var routes = data[2];

        loadCountryData(geojson, adjacency);
        createSearchbar();

        loadGameState(routes);

        loadGuesses();

        loadTopText();

        updateGuessButton();

        initializeHintsUI();

        if (!GAME_STATE.is_valid) {
            console.log("ERROR, invalid game state");
        }


        // map = new MapView("d3-map", getVisibleCountriesGeojson());
        map = new MapView(
            "d3-map",
            COUNTRY_ID_DATA_LOOKUP,
            COUNTRY_ADJACENCY,
            GAME_STATE);

        // Show finishing UI if completed
        maybeShowEndGameUI();
    }
);
