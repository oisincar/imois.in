'use strict';

// The svg
const map_svg = d3.select("svg"),
      width = +map_svg.attr("width"),
      height = +map_svg.attr("height");

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
    highlighted_country = null;

    // Past guesses stored as IDs
    past_guess_ids = [];
    // Successful guesses (also IDs)
    successful_guesses = [];

    get visible_countries() {
        return [this.start_country].concat(this.successful_guesses);
    }

    get last_guess() {
        var l = this.past_guess_ids.length;
        if (l == 0) return null;
        return this.past_guess_ids[l-1];
    };

    constructor(country) {
        this.start_country = country;
        this.highlighted_country = this.start_country;
    }

    make_guess(country_name) {
        var country_lower = country_name.toLowerCase();
        if (country_lower in COUNTRY_NAME_ID_LOOKUP) {
            var id = COUNTRY_NAME_ID_LOOKUP[country_lower];
            if (!this.successful_guesses.includes(id) && this.start_country != id) {
                this.past_guess_ids.push(id);

                // TODO: Determine if this country is adjacent to any others!
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

        // Unhighlight previous guess.
        remove_country_highlights();
        var id = COUNTRY_NAME_ID_LOOKUP[guess.toLowerCase()];
        var country_data = COUNTRY_ID_DATA_LOOKUP[id];
        add_country_to_map(country_data);
        recenter_map();

        SEARCH_BAR.clear();
    }
    else {
        console.log("Guess failed");
    }
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

    map_svg.attr("width", width)
           .attr("height", height)
           .attr("class", "map");

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
        // map.insert("path", ".graticule")
        //    .datum(topojson.feature(world, world.objects.land))
        //    .attr("class", "land")
        //    .attr("d", path);
        // console.log(visible_countries_geojson.features[j]);

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
                              // .scale(100) // TODO: Base on width/height vals
                              // .translate([width / 2, height / 2])
                              .rotate([-p[0],-p[1]])
                              // .fitSize([width, height], geojson);
                              .fitExtent([[m,m], [width-m, height-m]], geojson);

    return target_projection;
}

function recenter_map() {
    d3.transition()
      .duration(1250)
      .tween("rotate", function() {
          // var id = d3.select(this).attr("data-country-id");
          // var data = COUNTRY_ID_DATA_LOOKUP[id];
          var data = get_visible_countries_geojson();

          // Calculate target projection
          var target_projection = calculate_ideal_projection(data);

          console.log("target_zoom", target_projection.scale());

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

    setTimeout(() => {
        alert.classList.add("hide")
        alert.addEventListener("transitionend", () => {
            alert.remove()
        })
    }, duration)
}


// var last_projection = null;
// function reload_map() {
//     var visible_countries = GAME_STATE.visible_countries;

//     var visible_countries_geojson = {
//         type: "FeatureCollection",
//         "features": visible_countries.map(country_id => COUNTRY_ID_DATA_LOOKUP[country_id])
//     };
//     console.log(visible_countries_geojson);

//     const new_projection = d3.geoAzimuthalEquidistant()
//                              .rotate([-100, 0])
//                              .fitSize([width, height], visible_countries_geojson);

//     var path = d3.geoPath(new_projection);

//     // Draw data for the first time.
//     if (last_projection == null) {

//         svg.append('g')
//            .selectAll("path")
//            .data(visible_countries_geojson.features)
//            .enter()
//            .append("path")
//            .style("fill", "blue")
//            .style("stroke-width", "1")
//            .style("stroke", "black")
//            .attr('d', d3.geoPath().projection(new_projection));
//     }
//     // Otherwise, transition to this one
//     else {
//         // Load new data
//         svg.selectAll("*").remove();
//         svg.append('g')
//            .selectAll("path")
//            .data(visible_countries_geojson.features)
//            .enter()
//            .append("path")
//            .attr("fill", function (country) {
//                // if it's the latest country to be guessed, make it a diff color...
//                if (country.id == GAME_STATE.last_guess) {
//                    return "red";
//                }
//                else {
//                    return "blue";
//                }
//            })
//            .style("stroke-width", "1")
//            .style("stroke", "black")
//            .attr('d', d3.geoPath().projection(last_projection));

//         // Then animate movement...
//         svg.selectAll('path').interrupt().transition()
//            .duration(750).ease(d3.easeCubicInOut)
//            .attr('d', path);
//     }
//     last_projection = new_projection;
// }

var GAME_STATE = new GameState("IRL");

// Load external data and boot
// https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson
// d3.queue?? .json('country_adjacentcy.json')


Promise.all([
    d3.json("data/ne_50m_admin_0_map_units.geojson"),
    d3.json("data/country_adjacency.json"),
]).then(
    function(data) {
        var geojson = data[0];
        var adjacency = data[1];
        load_country_data(geojson, adjacency);

        create_searchbar();

        GAME_STATE.make_guess("France");
        // GAME_STATE.make_guess("Spain");
        // GAME_STATE.make_guess("India");
        // GAME_STATE.make_guess("United States of America");
        load_map();
    }
);


// d3.json("data/ne_50m_admin_0_map_units.geojson").then(
//     function(geojson) {
//         load_country_data(geojson);

//         create_searchbar();

//         GAME_STATE.make_guess("France");
//         GAME_STATE.make_guess("Spain");
//         GAME_STATE.make_guess("India");
//         // GAME_STATE.make_guess("United States of America");
//         load_map();
//         // reload_map();
//     }
// );
