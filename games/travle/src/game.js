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

class GameState {
    start_country = null;
    target_country = null;
    shortest_solution = 0;
    highlighted_country = null;

    // Past guesses stored as IDs
    past_guess_ids = [];
    // Successful guesses (also IDs)
    successful_guesses = [];

    guess_ratings = [];

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

    constructor(start, target, shortest_solution) {
        this.start_country = start;
        this.target_country = target;
        this.shortest_solution = shortest_solution;

        this.highlighted_country = this.start_country;
    }

    make_guess(country_name) {
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
            else if (dist <= distToSol) {
                // Path through this new guess isn't farther than what we had before.
                guessRating = "🟧";
            }
            else {
                // Path is further
                guessRating = "🟥";
            }
        }
        this.guess_ratings.push(guessRating);

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

    check_if_game_over() {
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
function warnAboutCookies() {
    if (!has_warned_about_cookies) {
        showAlert("This game requires cookies to save your progress. If you navigate away your progress will be lost!", 10000);

        has_warned_about_cookies = true;
    }
}

// TODO: Fixme
function saveGameState() {
    var data = {
        "puzzle_number": puzzle_number,
        "game_state": game.state,
    };
    if (typeof COOKIES_ACCEPTED !== 'undefined' && COOKIES_ACCEPTED) {
        localStorage.setItem('crosswordle-game-state', JSON.stringify(data));
    }
    else {
        warnAboutCookies();
    }
}

// TODO: Fixme
function saveWinLoss(game_id, guesses, did_win) {
    // ...
}

function loadCountryData(geojson, adjacency) {
    // console.log(geojson.features.map(c => [c.properties.NAME, c.properties.NAME_LONG, c.properties.NAME_]))

    // Change a couple names...
    console.log("LOADING");
    var to_change = {
        // "Russian Federation": "Russia",
    };

    for (const country of geojson.features) {
        // This seems to be unique for all countries/territories
        var id = country.properties.SU_A3;
        // Store ID in a handy place.
        country.id = id;

        if (country.properties.NAME in to_change) {
            country.properties.NAME = to_change[country.properties.NAME];
        }

        COUNTRY_ID_DATA_LOOKUP[id] = country;
        COUNTRY_NAME_ID_LOOKUP[country.properties.NAME.toLowerCase()] = id;
        COUNTRY_NAME_ID_LOOKUP[country.properties.NAME_LONG.toLowerCase()] = id;
        COUNTRY_NAMES.push(country.properties.NAME);
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
        maximumItems: -1,
        onSelectItem: ({label, value}) => {
            console.log("user selected:", label, value);
        },
        onEnterSelection: () => {
            submit_current_guess();
        }
    });

    // Also set up the button
    console.log(document);
    var btn = document.getElementById("btn-guess");
    btn.addEventListener("click", function () {
        submit_current_guess();
    });
}

function submit_current_guess() {
    var guess = SEARCH_BAR.value;

    if (GAME_STATE.make_guess(guess)) {
        console.log("Successfully guessed!")

        // Unhighlight previous guess.
        map.remove_country_highlights();
        var id = GAME_STATE.last_guess;
        var country_data = COUNTRY_ID_DATA_LOOKUP[id];
        map.add_country_to_map(country_data);
        map.recenter_map();

        SEARCH_BAR.clear();

        guessManager.addGuess(country_data.properties.NAME, GAME_STATE.last_rating);

        console.log("Checking if game over!");
        if (GAME_STATE.check_if_game_over()) {
            win();
        }
    }
    else {
        console.log("Guess failed");
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

function win() {
    jsConfetti.addConfetti({
        emojis: allFlags,
        confettiNumber: 40,
    });

    showAlert("GAME OVER!");

    jsConfetti.addConfetti();

    // showResultsModal(1200);
}

function get_visible_countries_geojson() {
    var data = GAME_STATE.visible_countries.map(country_id => COUNTRY_ID_DATA_LOOKUP[country_id]);
    return {
        type: "FeatureCollection",
        "features": data,
    };
}

var map = null;
function load_map() {
    var visible_countries_geojson = get_visible_countries_geojson();
    console.log(visible_countries_geojson);
    map = new MapView("d3-map", visible_countries_geojson);
}

var guessManager;
function loadGuesses() {
    var elem = document.getElementById("past-guesses");
    guessManager = new PastGuessManager(elem, GAME_STATE.shortest_solution + 3);
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
function loadGameState(routes) {
    // TODO: Choose based on today's date...

    // var ix = 314; // Portugal <-> Austria
    // For testing... Randomly choose route!
    var ix = getRandomInt(routes.length);
    var route = routes[ix];
    GAME_STATE = new GameState(route.start, route.target, route.dist);
}

function load_top_text() {
    var start = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.start_country].properties.NAME;
    var target = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.target_country].properties.NAME;

    var title = document.getElementById("title-text");
    title.innerHTML = `Today I'd like to go from <b>${start}</b> to <b>${target}</b>`;

    fitty("#title-text");
}

// Load external data and boot
Promise.all([
    d3.json("data/ne_50m_admin_0_map_units.geojson"),
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

        load_top_text();

        if (!GAME_STATE.is_valid) {
            console.log("ERROR, invalid game state");
        }
        load_map();
    }
);
