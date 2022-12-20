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

class GameState {
    puzzle_ix = 0;
    start_country = null;
    target_country = null;
    shortest_solution = 0;
    highlighted_country = null;

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

    get possible_guesses() {
        return this.shortest_solution + 3;
    }

    get has_guesses_remaining() {
        return this.past_guess_ids.length < this.possible_guesses;
    }

    get share_text() {
        var baseText = `Travle #${this.puzzle_ix}: `;

        var start_c = COUNTRY_ID_DATA_LOOKUP[this.start_country].properties.NAME_EN;
        var end_c = COUNTRY_ID_DATA_LOOKUP[this.target_country].properties.NAME_EN;
        var num_guesses = this.past_guess_ids.length;

        if (this.game_progress == GAMEPLAY_STATE_LOST) {
            var steps_left = this.minimum_guesses_to_solve();
            var steps_txt = steps_left + " step" + (steps_left == 1 ? "" : "s")
            baseText += `From ${start_c} I made it to ${steps_txt} from ${end_c}\n`;
        }
        else {
            baseText += `I made it from ${start_c} to ${end_c} in ${this.past_guess_ids.length}/${this.possible_guesses} steps.\n`;
        }
        baseText += this.guess_ratings.join("") + "\n";
        baseText += "imois.in/games/travle";
        return baseText;
    }

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

                // TODO: Determine if this country is adjacent to any others?!
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
            guessRating = "✅";
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
                guessRating = "⬛";
            }
            else if (dist <= distToSol + 1) {
                // Path through this new guess isn't more than 1 farther than what we had before.
                guessRating = "🟧";
            }
            else {
                // Path is further
                guessRating = "🟥";
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
            console.log(perimiter);

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
}

class PastGuessManager {

    constructor(parentElement, numSections) {
        this.parentElement = parentElement;

        this.guessDomElements = [];
        this.guessIx = 0;

        for (var i = 0; i < numSections; i++) {
            var a = document.createElement('div');
            a.classList.add('countries-guess-empty');
            this.parentElement.appendChild(a);

            this.guessDomElements.push(a);
        }
    }

    addGuess(countryName, guessRating) {
        if (this.guessIx > this.guessDomElements.length) {
            console.log("Error: Out of guesses");
        }

        var elem = this.guessDomElements[this.guessIx];
        elem.className = 'countries-guess-full';
        elem.innerHTML = `<div class="guess-text">${countryName}</div><div class="guess-emoji">${guessRating}</div>`;

        this.guessIx++;
    }
}

let has_warned_about_cookies = false;
function loadCountryData(geojson, adjacency) {
    for (const country of geojson.features) {
        // This seems to be unique for all countries/territories
        var id = country.properties.SU_A3;
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
function createSearchbar() {
    var field = document.getElementById("countries-input");

    var data = COUNTRY_NAMES.map((name, ix) => {
        return {"label": name, "value": ix }
    });

    SEARCH_BAR = new Autocomplete(field, {
        data: data, //[{label: "I'm a label", value: 42}],
        threshold: 1,
        maximumItems: 3,
        onSelectItem: ({label, value}) => {
            field.focus();
        },
        onEnterSelection: () => {
            submitCurrentGuess();
        }
    });

    // Also set up the button
    console.log(document);
    var btn = document.getElementById("btn-guess");
    btn.addEventListener("click", function () {
        submitCurrentGuess();
    });
}

function submitCurrentGuess() {
    var guess = SEARCH_BAR.value.trim();
    console.log(`>${guess}<`);


    if (GAME_STATE.make_guess(guess)) {
        console.log("Successfully guessed!")

        // Unhighlight previous guess.
        map.remove_country_highlights();
        var id = GAME_STATE.last_guess;
        var country_data = COUNTRY_ID_DATA_LOOKUP[id];
        map.add_country_to_map(country_data);
        map.recenter_map();

        SEARCH_BAR.clear();

        guessManager.addGuess(country_data.properties.NAME_EN, GAME_STATE.last_rating);

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
        win();
    }
    else if (GAME_STATE.game_progress === GAMEPLAY_STATE_LOST) {
        lose();
    }
}

function win() {
    jsConfetti.addConfetti({
        emojis: allFlags,
        confettiNumber: 40,
    });

    showAlert("GAME OVER!");

    jsConfetti.addConfetti();

    showResultsModal(1200);
}

function lose() {
    showAlert("0 guesses remaining... :c");
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
    var emojis = document.getElementById("resultsModalEmojis");
    var copy_button = document.getElementById("resultsModelCopyButton");
    var share_button = document.getElementById("resultsModelShareButton");
    let modal = new bootstrap.Modal(document.getElementById('resultsModal'), {});

    title.textContent = "Travle #" + GAME_STATE.puzzle_ix + ": ";

    // Game hasn't finished
    if (GAME_STATE.game_progress === GAMEPLAY_STATE_ONGOING) {
        txt.textContent = "";
        emojis.innerHTML = "";

        // Hide share buttons
        copy_button.classList.add('invisible');
        share_button.classList.add('invisible');
    }
    else {
        var did_win = (GAME_STATE.game_progress === GAMEPLAY_STATE_WON);

        var start_c = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.start_country].properties.NAME_EN;
        var end_c = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.target_country].properties.NAME_EN;

        if (did_win) {
            var num_steps = GAME_STATE.past_guess_ids.length;
            txt.innerHTML = `Success! You got from ${start_c} to ${end_c} in <b>${num_steps} steps</b>.<br>`
                + `The best possible solution was <b>${GAME_STATE.shortest_solution-1} steps</b>.<br>`
        }
        else {
            var steps_left = GAME_STATE.minimum_guesses_to_solve();
            var steps_txt = steps_left + " step" + (steps_left == 1 ? "" : "s")
            txt.innerHTML = `So close. You were just <b>${steps_txt}</b> from ${end_c}.<br>`
                + `The best possible solution was <b>${GAME_STATE.shortest_solution-1} steps</b>.<br>`;
        }
        txt.innerHTML += "<br>Guess breakdown:";

        emojis.innerHTML = GAME_STATE.guess_ratings.join("");

        // let emojis_txt = game.getBoardBreakdown().join("<br>");
        // if (!did_win) {
        //     emojis_txt += "<br><br>";
        //     emojis_txt += game.getSolutionBreakdown().join("<br>");
        // }
        // emojis.innerHTML = emojis_txt;

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

function getVisibleCountriesGeojson() {
    var data = GAME_STATE.visible_countries.map(country_id => COUNTRY_ID_DATA_LOOKUP[country_id]);
    return {
        type: "FeatureCollection",
        "features": data,
    };
}

var map = null;
function loadMap() {
    map = new MapView("d3-map", getVisibleCountriesGeojson());
}

var guessManager;
function loadGuesses() {
    var elem = document.getElementById("past-guesses");
    guessManager = new PastGuessManager(elem, GAME_STATE.possible_guesses);
    for (var i = 0; i < GAME_STATE.past_guess_ids.length; i++) {
        var countryId = GAME_STATE.past_guess_ids[i];
        var countryName = COUNTRY_ID_DATA_LOOKUP[countryId].properties.NAME_EN;
        var guessRating = GAME_STATE.guess_ratings[i];
        guessManager.addGuess(countryName, guessRating);
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

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

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
    // Crosswordle released 15th Dec 2022!
    const dt = Date.now() - new Date(2022, 11, 15);
    const dayOffset = dt / (1000 * 60 * 60 * 24)
    return Math.floor(dayOffset + 1); // Puzzle #1 on 15th
}

function loadGameState(routes) {
    // TODO: Choose based on today's date...
    var ix = getPuzzleNumber();
    console.log("Playing Travle #", ix);
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
        }
    }

    // Show finishing UI if completed
    maybeShowEndGameUI();
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

    var title = `Travle #${GAME_STATE.puzzle_ix}`;

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

        if (!GAME_STATE.is_valid) {
            console.log("ERROR, invalid game state");
        }
        loadMap();
    }
);
