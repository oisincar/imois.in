'use strict';

// Load and set up SVG for rendering map
var width, height;

// Make SVG responsive
function responsivefy(svg) {
    // get container + svg aspect ratio
    var container = d3.select(svg.node().parentNode);
        // width = parseInt(svg.style("width")),
        // height = parseInt(svg.style("height")),
    var aspect = 1.3;

    var targetWidth = parseInt(container.style("width"));

    width = targetWidth;
    height = Math.round(targetWidth / aspect);

    console.log(targetWidth);

    svg.attr("width", width);
    svg.attr("height", height);

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
       .attr("perserveAspectRatio", "xMinYMid")
       .call(resize);

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on("resize." + container.attr("id"), resize);

    // get width of container and resize svg to fit it
    function resize() {
        var targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
    resize();
}

const map_svg = d3.select("#d3-map");

map_svg.call(responsivefy);


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
    highlighted_country = null;

    // Past guesses stored as IDs
    past_guess_ids = [];
    // Successful guesses (also IDs)
    successful_guesses = [];

    get visible_countries() {
        return [this.start_country, this.target_country].concat(this.successful_guesses);
    }

    get last_guess() {
        var l = this.past_guess_ids.length;
        if (l == 0) return null;
        return this.past_guess_ids[l-1];
    };

    constructor(start, target) {
        this.start_country = start;
        this.target_country = target;
        this.highlighted_country = this.start_country;
    }

    make_guess(country_name) {
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
                return true;
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
            for (const neighbor of COUNTRY_ADJACENCY[elem]) {
                if (guessed_countries.has(neighbor)) {
                    perimeter.push(neighbor);
                }
            }
        }

        console.log("Could not find a path from start to end, but visited:", visited);

        // We didn't find any path between start and end...
        return false;
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

function load_country_data(geojson, adjacency) {
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
function create_searchbar() {
    SEARCH_BAR = new AutocompleteDropDown(COUNTRY_NAMES);
    SEARCH_BAR.addSubmitListener((s) => submit_current_guess());

    // Also set up the button
    console.log(document);
    var btn = document.getElementById("btn-guess");
    btn.addEventListener("click", function () {
        submit_current_guess();
    });
}

function submit_current_guess() {
    var guess = SEARCH_BAR.countriesInput.value;

    if (GAME_STATE.make_guess(guess)) {
        console.log("Successfully guessed!")

        console.log("Checking if game over!");
        if (GAME_STATE.check_if_game_over()) {
            win();
        }

        // Unhighlight previous guess.
        remove_country_highlights();
        var id = COUNTRY_NAME_ID_LOOKUP[guess.toLowerCase()];
        var country_data = COUNTRY_ID_DATA_LOOKUP[id];
        add_country_to_map(country_data);
        recenter_map();

        SEARCH_BAR.clear();

        add_guess_to_guess_history(country_data.properties.NAME);
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


var guess_history_div = document.getElementById("past-guesses");
function add_guess_to_guess_history(country_name) {
    var div_str = `<div class="row" data-value="${country_name}"<span">${country_name}</span></div>`;

    guess_history_div.innerHTML += div_str;
}

var projection = null;
var path = null;
var colors = { clickable: 'darkgrey', hover: 'grey', clicked: "red", clickhover: "darkred" };

function get_visible_countries_geojson() {
    var data = GAME_STATE.visible_countries.map(country_id => COUNTRY_ID_DATA_LOOKUP[country_id]);
    return {
        type: "FeatureCollection",
        "features": data,
    };
}

function load_map() {
    var visible_countries_geojson = get_visible_countries_geojson();
    console.log(visible_countries_geojson);

    // Focus on the highlighted country...
    var country_data = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.highlighted_country];

    projection = calculate_ideal_projection(visible_countries_geojson);

    path = d3.geoPath()
             .projection(projection);

    var graticule = d3.geoGraticule();

    map_svg.attr("class", "map");
//.attr("width", width)
           // .attr("height", height)


    map_svg.append("defs").append("path")
           .datum({type: "Sphere"})
           .attr("id", "sphere")
           .attr("d", path);

    map_svg.append("use")
           .attr("class", "stroke")
           .attr("xlink:href", "#sphere");

    map_svg.append("use")
           .attr("class", "fill")
           .attr("xlink:href", "#sphere");

    map_svg.append("path")
           .datum(graticule)
           .attr("class", "graticule")
           .attr("d", path);

    for (const country_data of visible_countries_geojson.features) {
        add_country_to_map(country_data);
    }
}

function add_country_to_map(country_data) {
    console.log("Adding: " + country_data.id);
    // Last country guessed is highlighted - which is also the first country when that's happening.
    var color = country_data.id === GAME_STATE.highlighted_country ? colors.clicked : colors.clickable;

    map_svg.insert("path", ".graticule")
       .datum(country_data)
       .attr("fill", color)
       .attr("stroke", "#222")
       .attr("d", path)
       .attr("class", "clickable")
       .attr("data-country-id", country_data.id)
       // .on("click", function() {
       //     d3.selectAll(".clicked")
       //       .classed("clicked", false);
       //       // .attr("fill", colors.clickable);
       //     d3.select(this)
       //       .classed("clicked", true);
       //       // .attr("fill", colors.clicked);

       //     d3.select(this).transition()
       //       .duration(1250)
       //       .tween("rotate", function() {
       //           // var id = d3.select(this).attr("data-country-id");
       //           // var data = COUNTRY_ID_DATA_LOOKUP[id];
       //           var data = get_visible_countries_geojson();

       //           var p = d3.geoCentroid(data);
       //           var r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
       //           return function (t) {
       //               projection.rotate(r(t));
       //               map_svg.selectAll("path").attr("d", path);
       //           }
       //       });
       // })
       // .on("mousemove", function() {
       //     var c = d3.select(this);
       //     // if (c.classed("clicked")) {
       //     //     c.attr("fill", colors.clickhover);
       //     // } else {
       //     c.attr("fill", colors.hover);
       //     // }
       // })
       // .on("mouseout", function() {
       //     var c = d3.select(this);
       //     // if (c.classed("clicked")) {
       //     //     c.attr("fill", colors.clicked);
       //     // } else {
       //     d3.select(this).attr("fill", colors.clickable);
       //     // }
       // });
}

function calculate_ideal_projection(geojson) {
    var p = d3.geoCentroid(geojson);

    var m = width * 0.05;

    // Calculate target projection
    var target_projection = d3.geoAzimuthalEquidistant()
                              .rotate([-p[0],-p[1]])
                              .fitExtent([[m,m], [width-m, height-m]], geojson);

    return target_projection;
}

function recenter_map() {
    d3.transition()
      .duration(1250)
      .tween("rotate", function() {
          var data = get_visible_countries_geojson();

          // Calculate target projection
          var target_projection = calculate_ideal_projection(data);

          var r = d3.interpolate(projection.rotate(), target_projection.rotate());
          var s = d3.interpolate(projection.scale(), target_projection.scale());
          var o = d3.interpolate(projection.translate(), target_projection.translate());
          return function (t) {
              projection.rotate(r(t)).scale(s(t)).translate(o(t));
              map_svg.selectAll("path").attr("d", path);
          }
      });
}

function remove_country_highlights() {
    // Deselect clicked countries
    d3.selectAll(".clickable")
      .attr("fill", colors.clickable);
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
function load_game_state(routes) {
    // TODO: Choose based on today's date...

    // For testing... Randomly choose route!
    var ix = getRandomInt(routes.length);
    var route = routes[ix];
    GAME_STATE = new GameState(route.start, route.target);
}

function load_top_text() {
    var start = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.start_country].properties.NAME;
    var target = COUNTRY_ID_DATA_LOOKUP[GAME_STATE.target_country].properties.NAME;

    var title = document.getElementById("title-text");
    title.innerHTML = `<h2>Today, I'd like to go from <b>${start}</b> to <b>${target}</b>!</h2>`;
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

        load_country_data(geojson, adjacency);
        create_searchbar();

        load_game_state(routes);

        load_top_text();

        if (!GAME_STATE.is_valid) {
            console.log("ERROR, invalid game state");
        }
        // GAME_STATE.make_guess("Spain");
        // GAME_STATE.make_guess("India");
        // GAME_STATE.make_guess("United States of America");
        load_map();
    }
);
